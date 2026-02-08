import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, OnModuleDestroy } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { LiftService } from './lift.service';
import { LiftSnapshot } from '../shared/lift.types';
import { RefereePosition, Decision, ALL_REFEREE_POSITIONS, ALL_DECISIONS } from '../shared/lift.constants';

interface ClientData {
  position?: RefereePosition;
}

/** Type guard to validate referee position strings from client. */
function isValidPosition(position: string): position is RefereePosition {
  return ALL_REFEREE_POSITIONS.includes(position as RefereePosition);
}

/** Type guard to validate decision strings from client. */
function isValidDecision(decision: string): decision is Decision {
  return ALL_DECISIONS.includes(decision as Decision);
}

/**
 * WebSocket gateway for real-time lift state management.
 *
 * Handles WebSocket connections from referees, jury, and displays.
 * Validates incoming messages, forwards them to the service layer,
 * and broadcasts state updates to all connected clients.
 *
 * Supports optional token-based authentication via AUTH_TOKEN env variable.
 */
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: (process.env.CORS_ORIGIN || '*') !== '*',
  },
})
export class LiftGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  private readonly logger = new Logger(LiftGateway.name);

  @WebSocketServer()
  server!: Server;

  private clients = new Map<string, ClientData>();
  private unsubscribe: (() => void) | undefined;

  /**
   * Initialize gateway and subscribe to state machine changes.
   * All state changes are automatically broadcast to connected clients.
   */
  constructor(private readonly liftService: LiftService) {
    this.unsubscribe = this.liftService.subscribe((snapshot) => {
      this.logger.log(`State changed: ${snapshot.state}, decisions: ${snapshot.context.decisions.size}`);
      this.broadcastState(snapshot);
    });
  }

  /**
   * Cleanup subscription when module is destroyed.
   * Prevents memory leaks on hot reload or shutdown.
   */
  onModuleDestroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  /**
   * Handle new WebSocket connections.
   * Validates authentication token if AUTH_TOKEN env variable is set.
   *
   * @param client Socket.IO client connection
   */
  handleConnection(client: Socket) {
    const authToken = process.env.AUTH_TOKEN;

    // If auth token is configured, validate it
    if (authToken) {
      const clientToken = client.handshake.auth?.token || client.handshake.query?.token;

      if (clientToken !== authToken) {
        this.logger.warn(`Client ${client.id} rejected: invalid token`);
        client.emit('error', { message: 'Invalid authentication token' });
        client.disconnect();
        return;
      }
    }

    this.logger.log(`Client connected: ${client.id}`);
  }

  /**
   * Handle WebSocket disconnections.
   * Notifies service if a referee disconnects so connection tracking stays accurate.
   *
   * @param client Socket.IO client connection
   */
  handleDisconnect(client: Socket) {
    const clientData = this.clients.get(client.id);
    if (clientData?.position) {
      this.liftService.refereeDisconnected(clientData.position);
      // No need to manually broadcast - the subscription will handle it
    }
    this.clients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Handle 'join' event when a client identifies their role.
   * Sends current state to the new client and registers referee connections.
   *
   * @param client Socket.IO client
   * @param data Contains optional position (left, chief, right) for referees
   * @returns Success response or error if position is invalid
   */
  @SubscribeMessage('join')
  async handleJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { position?: string }) {
    if (data.position && !isValidPosition(data.position)) {
      return { success: false, error: 'Invalid position' };
    }

    const position = data.position as RefereePosition | undefined;
    this.clients.set(client.id, { position });

    // Send current state to newly connected client
    const state = this.liftService.getState();
    client.emit('stateUpdate', this.serializeState(state));

    // Register referee connection after sending initial state
    if (position) {
      this.liftService.refereeConnected(position);
    }

    return { success: true };
  }

  /**
   * Handle 'decision' event when a referee makes a decision.
   * Validates position and decision before forwarding to service.
   *
   * @param client Socket.IO client
   * @param data Contains position and decision
   * @returns Success response or error if validation fails
   */
  @SubscribeMessage('decision')
  async handleDecision(@ConnectedSocket() client: Socket, @MessageBody() data: { position: string; decision: string }) {
    if (!isValidPosition(data.position)) {
      return { success: false, error: 'Invalid position' };
    }
    if (!isValidDecision(data.decision)) {
      return { success: false, error: 'Invalid decision' };
    }

    this.liftService.makeDecision(data.position, data.decision);
    return { success: true };
  }

  /**
   * Handle 'resetRefereeDecision' event when a referee retracts their decision.
   *
   * @param client Socket.IO client
   * @param data Contains position to reset
   * @returns Success response or error if position is invalid
   */
  @SubscribeMessage('resetRefereeDecision')
  async handleResetDecision(@ConnectedSocket() client: Socket, @MessageBody() data: { position: string }) {
    if (!isValidPosition(data.position)) {
      return { success: false, error: 'Invalid position' };
    }

    this.liftService.resetRefereeDecision(data.position);
    return { success: true };
  }

  /** Handle 'revealDecisions' event to display the lights when all decisions are in. */
  @SubscribeMessage('revealDecisions')
  async handleRevealDecisions() {
    this.liftService.revealDecisions();
    return { success: true };
  }

  /** Handle 'resetAll' event to clear all decisions and return to awaiting decisions. */
  @SubscribeMessage('resetAll')
  async handleReset() {
    this.liftService.resetAll();
    return { success: true };
  }

  /**
   * Handle 'juryOverrule' event when jury overrules with a specific decision.
   *
   * @param client Socket.IO client
   * @param data Contains the jury's decision
   * @returns Success response or error if decision is invalid
   */
  @SubscribeMessage('juryOverrule')
  async handleJuryOverrule(@ConnectedSocket() client: Socket, @MessageBody() data: { decision: string }) {
    if (!isValidDecision(data.decision)) {
      return { success: false, error: 'Invalid decision' };
    }

    this.liftService.juryOverrule(data.decision);
    return { success: true };
  }

  /** Handle 'clearJuryOverrule' event to exit jury overrule mode. */
  @SubscribeMessage('clearJuryOverrule')
  async handleClearJuryOverrule() {
    this.liftService.clearJuryOverrule();
    return { success: true };
  }

  /**
   * Broadcast state update to all connected clients.
   * Called automatically after every state change via subscription.
   */
  private broadcastState(snapshot: LiftSnapshot) {
    this.server.emit('stateUpdate', this.serializeState(snapshot));
  }

  /**
   * Serialize state for WebSocket transmission.
   * Converts Map and Set to arrays since they don't serialize to JSON.
   *
   * @param snapshot State snapshot from machine
   * @returns JSON-serializable state object
   */
  private serializeState(snapshot: LiftSnapshot) {
    return {
      state: snapshot.state,
      context: {
        decisions: Array.from(snapshot.context.decisions.entries()).map(([pos, dec]) => ({
          position: pos,
          decision: dec,
        })),
        connectedReferees: Array.from(snapshot.context.connectedReferees),
        juryOverrule: snapshot.context.juryOverrule,
      },
    };
  }
}
