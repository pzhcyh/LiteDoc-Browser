import { AbilityConstant, UIAbility, Want } from '@kit.AbilityKit';
import { window } from '@kit.ArkUI';
import { hilog } from '@kit.PerformanceAnalysisKit';

const DOMAIN = 0x0001;

export default class EntryAbility extends UIAbility {
  onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    hilog.info(DOMAIN, 'LiteDoc', 'EntryAbility created');
  }

  onDestroy(): void {
    hilog.info(DOMAIN, 'LiteDoc', 'EntryAbility destroyed');
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    windowStage.loadContent('pages/Index', (error) => {
      if (error.code) {
        hilog.error(DOMAIN, 'LiteDoc', 'Failed to load Index page: %{public}s', JSON.stringify(error));
        return;
      }

      hilog.info(DOMAIN, 'LiteDoc', 'Index page loaded');
    });
  }

  onWindowStageDestroy(): void {
    hilog.info(DOMAIN, 'LiteDoc', 'Window stage destroyed');
  }

  onForeground(): void {
    hilog.info(DOMAIN, 'LiteDoc', 'EntryAbility foreground');
  }

  onBackground(): void {
    hilog.info(DOMAIN, 'LiteDoc', 'EntryAbility background');
  }
}

