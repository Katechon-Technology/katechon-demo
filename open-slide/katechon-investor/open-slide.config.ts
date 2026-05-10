import type { OpenSlideConfig } from '@open-slide/core';

const openSlideConfig: OpenSlideConfig = {
  port: 5175,
  build: {
    showSlideBrowser: false,
    showSlideUi: false,
    allowHtmlDownload: false,
  },
};

export default openSlideConfig;
