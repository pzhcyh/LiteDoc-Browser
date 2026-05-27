import { AbilityConstant, UIAbility, Want } from '@kit.AbilityKit';
import { window } from '@kit.ArkUI';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { OpenFileState } from '../common/OpenFileState';

const DOMAIN = 0x0001;

export default class EntryAbility extends UIAbility {
  private windowStage: window.WindowStage | null = null;

  onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    this.captureOpenFile(want);
    hilog.info(DOMAIN, 'LiteDoc', 'EntryAbility created');
  }

  onDestroy(): void {
    hilog.info(DOMAIN, 'LiteDoc', 'EntryAbility destroyed');
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    this.windowStage = windowStage;
    windowStage.loadContent('pages/Index', (error) => {
      if (error.code) {
        hilog.error(DOMAIN, 'LiteDoc', 'Failed to load Index page: %{public}s', JSON.stringify(error));
        return;
      }

      hilog.info(DOMAIN, 'LiteDoc', 'Index page loaded');
    });
  }

  onWindowStageDestroy(): void {
    this.windowStage = null;
    hilog.info(DOMAIN, 'LiteDoc', 'Window stage destroyed');
  }

  onNewWant(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    const hasOpenFile = this.captureOpenFile(want);
    hilog.info(DOMAIN, 'LiteDoc', 'EntryAbility received new want');

    if (hasOpenFile && this.windowStage) {
      this.windowStage.loadContent('pages/Index');
    }
  }

  onForeground(): void {
    hilog.info(DOMAIN, 'LiteDoc', 'EntryAbility foreground');
  }

  onBackground(): void {
    hilog.info(DOMAIN, 'LiteDoc', 'EntryAbility background');
  }

  private captureOpenFile(want: Want): boolean {
    const uri = this.uriFromWant(want);

    if (!uri) {
      return false;
    }

    OpenFileState.set(uri, want.type || '');
    hilog.info(DOMAIN, 'LiteDoc', 'Captured open file uri');
    return true;
  }

  private uriFromWant(want: Want): string {
    if (want.uri) {
      return want.uri;
    }

    const stream = want.parameters ? want.parameters['ability.params.stream'] : undefined;
    if (typeof stream === 'string') {
      return stream;
    }

    if (Array.isArray(stream) && stream.length > 0 && typeof stream[0] === 'string') {
      return stream[0];
    }

    return '';
  }
}
