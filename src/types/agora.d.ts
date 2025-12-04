declare module 'agora-rtc-sdk-ng' {
  export namespace AgoraRTC {
    export interface ILocalVideoTrack {
      getTrackId(): string;
      enabled: boolean;
      isPlaying: boolean;
      muted: boolean;
      isMuted?: boolean;
      play(element: HTMLElement, config?: any): Promise<void>;
      stop(): void;
      close(): void;
      setEnabled(enabled: boolean): Promise<void>;
      setMuted(muted: boolean): Promise<void>;
      setDevice(deviceId: string): Promise<void>;
      on(event: string, callback: (...args: any[]) => void): void;
    }

    export interface ILocalAudioTrack {
      getTrackId(): string;
      enabled: boolean;
      muted: boolean;
      isMuted?: boolean;
      play(): Promise<void>;
      stop(): void;
      close(): void;
      setEnabled(enabled: boolean): Promise<void>;
      setMuted(muted: boolean): Promise<void>;
      setDevice(deviceId: string): Promise<void>;
    }

    export interface IRemoteVideoTrack {
      stop(): void;
      play(element: HTMLElement, config?: any): Promise<void>;
    }

    export interface IRemoteAudioTrack {
      stop(): void;
      play(): Promise<void>;
    }

    export interface IAgoraRTCRemoteUser {
      uid: number;
      hasVideo: boolean;
      hasAudio: boolean;
      videoTrack: IRemoteVideoTrack | null;
      audioTrack: IRemoteAudioTrack | null;
    }

    export type ConnectionState = 'CONNECTED' | 'CONNECTING' | 'RECONNECTING' | 'DISCONNECTING' | 'DISCONNECTED' | 'FAILED';

    export interface IAgoraRTCClient {
      connectionState: ConnectionState;
      role?: 'host' | 'audience';
      localTracks: Array<ILocalVideoTrack | ILocalAudioTrack>;
      remoteUsers: IAgoraRTCRemoteUser[];
      join(appId: string, channel: string, token: string | null, uid: number | null): Promise<number>;
      leave(): Promise<void>;
      publish(track: ILocalVideoTrack | ILocalAudioTrack): Promise<void>;
      unpublish(track: ILocalVideoTrack | ILocalAudioTrack): Promise<void>;
      subscribe(user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video'): Promise<void>;
      setClientRole(role: 'host' | 'audience'): Promise<void>;
      on(event: string, callback: (...args: any[]) => void): void;
      removeAllListeners(): void;
    }

    export function createClient(config: {
      mode: 'live' | 'rtc';
      codec: 'vp8' | 'vp9' | 'h264';
    }): IAgoraRTCClient;

    export function createCameraVideoTrack(config?: {
      cameraId?: string;
      encoderConfig?: {
        width?: number;
        height?: number;
        frameRate?: number;
        bitrateMax?: number;
      };
    }): Promise<ILocalVideoTrack>;

    export function createMicrophoneAudioTrack(config?: {
      microphoneId?: string;
    }): Promise<ILocalAudioTrack>;

    export function getDevices(): Promise<MediaDeviceInfo[]>;
  }

  const AgoraRTCDefault: {
    createClient: AgoraRTC.createClient;
    createCameraVideoTrack: AgoraRTC.createCameraVideoTrack;
    createMicrophoneAudioTrack: AgoraRTC.createMicrophoneAudioTrack;
    getDevices: AgoraRTC.getDevices;
  };

  export default AgoraRTCDefault;
}
