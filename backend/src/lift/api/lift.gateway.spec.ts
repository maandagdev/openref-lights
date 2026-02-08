import { Test, TestingModule } from '@nestjs/testing';
import { LiftGateway } from './lift.gateway';
import { LiftService } from './lift.service';
import { Socket } from 'socket.io';
import { RefereePosition, Decision } from '../shared/lift.constants';

describe('LiftGateway', () => {
  let gateway: LiftGateway;
  let service: LiftService;
  let mockClient: Partial<Socket>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LiftGateway, LiftService],
    }).compile();

    gateway = module.get<LiftGateway>(LiftGateway);
    service = module.get<LiftService>(LiftService);

    // Mock Socket.IO client
    mockClient = {
      id: 'test-client-id',
      emit: jest.fn(),
      disconnect: jest.fn(),
      handshake: {
        auth: {},
        query: {},
      } as any,
    };

    // Mock server
    gateway.server = {
      emit: jest.fn(),
    } as any;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should allow connection when no auth token is configured', () => {
      delete process.env.AUTH_TOKEN;
      gateway.handleConnection(mockClient as Socket);

      expect(mockClient.disconnect).not.toHaveBeenCalled();
    });

    it('should reject connection with invalid token', () => {
      process.env.AUTH_TOKEN = 'secret-token';
      mockClient.handshake!.auth = { token: 'wrong-token' };

      gateway.handleConnection(mockClient as Socket);

      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        message: 'Invalid authentication token',
      });
      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    it('should allow connection with valid token', () => {
      process.env.AUTH_TOKEN = 'secret-token';
      mockClient.handshake!.auth = { token: 'secret-token' };

      gateway.handleConnection(mockClient as Socket);

      expect(mockClient.disconnect).not.toHaveBeenCalled();
    });

    it('should accept token from query params', () => {
      process.env.AUTH_TOKEN = 'secret-token';
      mockClient.handshake!.query = { token: 'secret-token' };

      gateway.handleConnection(mockClient as Socket);

      expect(mockClient.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('handleJoin', () => {
    it('should accept valid position', async () => {
      const result = await gateway.handleJoin(mockClient as Socket, {
        position: RefereePosition.LEFT,
      });

      expect(result?.success).toBe(true);
      expect(mockClient.emit).toHaveBeenCalledWith('stateUpdate', expect.any(Object));
    });

    it('should reject invalid position', async () => {
      const result = await gateway.handleJoin(mockClient as Socket, {
        position: 'invalid',
      });

      expect(result).toEqual({ success: false, error: 'Invalid position' });
    });

    it('should work without position (for display/jury)', async () => {
      const result = await gateway.handleJoin(mockClient as Socket, {});

      expect(result?.success).toBe(true);
      // Verify referee was not connected when no position provided
      const state = service.getState();
      expect(state.context.connectedReferees.size).toBe(0);
    });
  });

  describe('handleDecision', () => {
    it('should accept valid decision', async () => {
      const result = await gateway.handleDecision(mockClient as Socket, {
        position: RefereePosition.LEFT,
        decision: Decision.WHITE,
      });

      expect(result.success).toBe(true);
      expect(gateway.server.emit).toHaveBeenCalledWith('stateUpdate', expect.any(Object));
    });

    it('should reject invalid position', async () => {
      const result = await gateway.handleDecision(mockClient as Socket, {
        position: 'invalid',
        decision: 'white',
      });

      expect(result).toEqual({ success: false, error: 'Invalid position' });
    });

    it('should reject invalid decision', async () => {
      const result = await gateway.handleDecision(mockClient as Socket, {
        position: RefereePosition.LEFT,
        decision: 'invalid',
      });

      expect(result).toEqual({ success: false, error: 'Invalid decision' });
    });

    it('should accept all decision types', async () => {
      const decisions = [Decision.WHITE, Decision.RED, Decision.BLUE, Decision.YELLOW];

      for (const decision of decisions) {
        const result = await gateway.handleDecision(mockClient as Socket, {
          position: RefereePosition.LEFT,
          decision,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('handleResetDecision', () => {
    it('should reset decision for valid position', async () => {
      await gateway.handleDecision(mockClient as Socket, {
        position: RefereePosition.LEFT,
        decision: Decision.WHITE,
      });

      const result = await gateway.handleResetDecision(mockClient as Socket, {
        position: RefereePosition.LEFT,
      });

      expect(result.success).toBe(true);
    });

    it('should reject invalid position', async () => {
      const result = await gateway.handleResetDecision(mockClient as Socket, {
        position: 'invalid',
      });

      expect(result).toEqual({ success: false, error: 'Invalid position' });
    });
  });

  describe('handleRevealDecisions', () => {
    it('should trigger reveal decisions event', async () => {
      const result = await gateway.handleRevealDecisions();

      expect(result.success).toBe(true);
      expect(gateway.server.emit).toHaveBeenCalledWith('stateUpdate', expect.any(Object));
    });
  });

  describe('handleReset', () => {
    it('should reset the system', async () => {
      const result = await gateway.handleReset();

      expect(result.success).toBe(true);
      expect(gateway.server.emit).toHaveBeenCalledWith('stateUpdate', expect.any(Object));
    });
  });

  describe('handleJuryOverrule', () => {
    it('should accept valid jury overrule', async () => {
      const result = await gateway.handleJuryOverrule(mockClient as Socket, {
        decision: Decision.WHITE,
      });

      expect(result.success).toBe(true);
    });

    it('should reject invalid decision', async () => {
      const result = await gateway.handleJuryOverrule(mockClient as Socket, {
        decision: 'invalid',
      });

      expect(result).toEqual({ success: false, error: 'Invalid decision' });
    });
  });

  describe('handleClearJuryOverrule', () => {
    it('should clear jury overrule', async () => {
      await gateway.handleJuryOverrule(mockClient as Socket, {
        decision: Decision.WHITE,
      });

      const result = await gateway.handleClearJuryOverrule();

      expect(result.success).toBe(true);
    });
  });

  describe('handleDisconnect', () => {
    it('should remove referee on disconnect', () => {
      gateway['clients'].set(mockClient.id!, { position: RefereePosition.LEFT });

      gateway.handleDisconnect(mockClient as Socket);

      const state = service.getState();
      expect(state.context.connectedReferees.has(RefereePosition.LEFT)).toBe(false);
    });
  });
});
