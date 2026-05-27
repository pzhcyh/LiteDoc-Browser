export interface PendingOpenFile {
  uri: string;
  type: string;
}

export class OpenFileState {
  private static pending: PendingOpenFile = {
    uri: '',
    type: ''
  };

  static set(uri: string, type: string = ''): void {
    OpenFileState.pending = {
      uri,
      type
    };
  }

  static take(): PendingOpenFile {
    const pending = OpenFileState.pending;
    OpenFileState.pending = {
      uri: '',
      type: ''
    };
    return pending;
  }
}
