import { Injectable, signal, computed } from '@angular/core';
import { io, ManagerOptions, Socket, SocketOptions } from 'socket.io-client';
import { Decision, LiftState, LiftStateType, RefereePosition } from '../models/lift.model';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class LiftService {
  private socket: Socket | null = null;

  private _state = signal<LiftState | null>(null);
  private _isConnected = signal(false);
  public readonly state = this._state.asReadonly();

  public readonly isConnected = this._isConnected.asReadonly();
  public readonly currentState = computed(() => this._state()?.state ?? LiftStateType.AWAITING_DECISIONS);
  public readonly decisions = computed(() => this._state()?.context.decisions ?? []);

  private readonly BACKEND_URL = environment.backendUrl;
  private readonly AUTH_TOKEN = environment.authToken;
  private readonly isDebug = environment.debug;

  private debug(...args: unknown[]) {
    if (this.isDebug) {
      console.log(...args);
    }
  }

  connect(position?: RefereePosition) {
    if (this.socket?.connected) {
      this.debug('Already connected');

      return;
    }

    const socketOptions: Partial<ManagerOptions & SocketOptions> = {
      reconnection: true,
      reconnectionDelay: 1000,
    };

    // Add auth token if configured
    if (this.AUTH_TOKEN) {
      socketOptions.auth = {
        token: this.AUTH_TOKEN,
      };
    }

    this.debug('Connecting to:', this.BACKEND_URL, 'as:', position ?? 'display/control client');
    this.socket = io(this.BACKEND_URL, socketOptions);

    this.socket.on('connect', () => {
      this.debug('Connected to server, socket ID:', this.socket?.id);
      this._isConnected.set(true);
      this.socket?.emit('join', { position });
    });

    this.socket.on('stateUpdate', (data: LiftState) => {
      this.debug('State update received:', data.state, 'decisions:', data.context.decisions.length);
      this._state.set({ ...data });
    });

    this.socket.on('disconnect', (reason) => {
      this.debug('Disconnected from server:', reason);
      this._isConnected.set(false);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      this.debug('Reconnected after', attemptNumber, 'attempts');
      this._isConnected.set(true);
      if (position) {
        this.socket?.emit('join', { position });
      }
    });

    this.socket.on('error', (error: Error) => {
      console.error('Socket error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.debug('Disconnecting socket');
      this.socket.disconnect();
      this.socket = null;
      this._state.set(null);
      this._isConnected.set(false);
    }
  }

  makeDecision(position: RefereePosition, decision: Decision) {
    this.debug('Making decision:', position, decision);
    this.socket?.emit('decision', { position, decision });
  }

  resetRefereeDecision(position: RefereePosition) {
    this.debug('Resetting referee decision:', position);
    this.socket?.emit('resetRefereeDecision', { position });
  }

  revealDecisions() {
    this.debug('Reveal decisions');
    this.socket?.emit('revealDecisions');
  }

  resetAll() {
    this.debug('Reset all');
    this.socket?.emit('resetAll');
  }

  juryOverrule(decision: Decision) {
    this.debug('Jury overrule:', decision);
    this.socket?.emit('juryOverrule', { decision });
  }

  clearJuryOverrule() {
    this.debug('Clear jury overrule');
    this.socket?.emit('clearJuryOverrule');
  }

  getCurrentState(): LiftState | null {
    return this._state();
  }
}
