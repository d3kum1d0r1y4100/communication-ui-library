// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React from 'react';
/* @conditional-compile-remove(file-sharing) */
import { FileMetadata } from './FileDownloadCards';
import { AttachmentMetadata, _FileDownloadCards } from './FileDownloadCards';
import { InlineImageMetadata } from './FileDownloadCards';
import { render, screen } from '@testing-library/react';
import { registerIcons } from '@fluentui/react';

describe('FileDownloadCards should be rendered properly', () => {
  beforeEach(() => {
    registerIcons({
      icons: {
        downloadfile: <></>,
        docx24_svg: <></>,
        editboxcancel: <></>
      }
    });
  });

  /* @conditional-compile-remove(file-sharing) */
  it('should render if it is FileSharingMetadata', async () => {
    const metadata = {
      name: 'MockFileCard',
      extension: 'docx',
      url: 'mockUrl',
      id: 'mockId',
      attachmentType: 'file'
    } as FileMetadata;

    const props = {
      userId: 'MockUserId',
      fileMetadata: [metadata]
    };
    renderFileDownloadCardsWithDefaults(props);
    const card = await screen.findByText('MockFileCard');
    expect(card).toBeDefined();
  });

  it('should not render if it is ImageFileMetadata', async () => {
    const metadata = {
      url: 'mockUrl',
      id: 'mockId',
      attachmentType: 'inlineImage',
      previewUrl: 'mockPreviewUrl'
    } as InlineImageMetadata;

    const props = {
      userId: 'MockUserId',
      fileMetadata: [metadata]
    };
    renderFileDownloadCardsWithDefaults(props);
    const card = await screen.queryByText('MockImageFileCard');
    expect(card).toBeNull();
  });
});

const renderFileDownloadCardsWithDefaults = (props: MockDownloadCardProps): void => {
  render(<_FileDownloadCards userId={props.userId} fileMetadata={props.fileMetadata} />);
};

interface MockDownloadCardProps {
  userId: string;
  fileMetadata: AttachmentMetadata[];
}
