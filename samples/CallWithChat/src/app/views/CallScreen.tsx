// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { TeamsMeetingLinkLocator } from '@azure/communication-calling';
import { CommunicationUserIdentifier } from '@azure/communication-common';
import {
  toFlatCommunicationIdentifier,
  useAzureCommunicationCallWithChatAdapter,
  CallAndChatLocator,
  CallWithChatAdapterState,
  CallWithChatComposite,
  CallWithChatAdapter,
  CallWithChatCompositeOptions
} from '@azure/communication-react';
/* @conditional-compile-remove(video-background-effects) */
import { onResolveVideoEffectDependencyLazy, AzureCommunicationCallAdapterOptions } from '@azure/communication-react';
import { Spinner } from '@fluentui/react';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSwitchableFluentTheme } from '../theming/SwitchableFluentThemeProvider';
import { createAutoRefreshingCredential } from '../utils/credential';
import { WEB_APP_TITLE } from '../utils/constants';
import { useIsMobile } from '../utils/useIsMobile';
import { isIOS } from '../utils/utils';

export interface CallScreenProps {
  token: string;
  userId: CommunicationUserIdentifier;
  displayName: string;
  endpoint: string;
  locator: CallAndChatLocator | TeamsMeetingLinkLocator;
  /* @conditional-compile-remove(PSTN-calls) */ alternateCallerId?: string;
}

export const CallScreen = (props: CallScreenProps): JSX.Element => {
  const {
    token,
    userId,
    displayName,
    endpoint,
    locator,
    /* @conditional-compile-remove(PSTN-calls) */ alternateCallerId
  } = props;

  /* @conditional-compile-remove(video-background-effects) */
  const callAdapterOptions: AzureCommunicationCallAdapterOptions = useMemo(() => {
    const videoBackgroundImages = [
      {
        key: 'ab1',
        url: '/assets/backgrounds/contoso.png',
        tooltipText: 'Custom Background'
      },
      {
        key: 'ab2',
        url: '/assets/backgrounds/abstract2.jpg',
        tooltipText: 'Custom Background'
      },
      {
        key: 'ab3',
        url: '/assets/backgrounds/abstract3.jpg',
        tooltipText: 'Custom Background'
      },
      {
        key: 'ab4',
        url: '/assets/backgrounds/room1.jpg',
        tooltipText: 'Custom Background'
      },
      {
        key: 'ab5',
        url: '/assets/backgrounds/room2.jpg',
        tooltipText: 'Custom Background'
      },
      {
        key: 'ab6',
        url: '/assets/backgrounds/room3.jpg',
        tooltipText: 'Custom Background'
      },
      {
        key: 'ab7',
        url: '/assets/backgrounds/room4.jpg',
        tooltipText: 'Custom Background'
      }
    ];
    return {
      videoBackgroundOptions: {
        videoBackgroundImages,
        /* @conditional-compile-remove(video-background-effects) */
        onResolveDependency: onResolveVideoEffectDependencyLazy
      }
    };
  }, []);

  // Disables pull down to refresh. Prevents accidental page refresh when scrolling through chat messages
  // Another alternative: set body style touch-action to 'none'. Achieves same result.
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'null';
    };
  }, []);

  const callIdRef = useRef<string>();
  const { currentTheme, currentRtl } = useSwitchableFluentTheme();
  const isMobileSession = useIsMobile();

  const credential = useMemo(
    () => createAutoRefreshingCredential(toFlatCommunicationIdentifier(userId), token),
    [userId, token]
  );

  const afterAdapterCreate = useCallback(
    async (adapter: CallWithChatAdapter): Promise<CallWithChatAdapter> => {
      adapter.on('callError', (e) => {
        // Error is already acted upon by the Call composite, but the surrounding application could
        // add top-level error handling logic here (e.g. reporting telemetry).
        console.log('Adapter error event:', e);
      });
      adapter.on('chatError', (e) => {
        // Error is already acted upon by the Chat composite, but the surrounding application could
        // add top-level error handling logic here (e.g. reporting telemetry).
        console.log('Adapter error event:', e);
      });
      adapter.onStateChange((state: CallWithChatAdapterState) => {
        const pageTitle = convertPageStateToString(state);
        document.title = `${pageTitle} - ${WEB_APP_TITLE}`;

        if (state?.call?.id && callIdRef.current !== state?.call?.id) {
          callIdRef.current = state?.call?.id;
          console.log(`Call Id: ${callIdRef.current}`);
        }
      });
      return adapter;
    },
    [callIdRef]
  );

  const adapter = useAzureCommunicationCallWithChatAdapter(
    {
      userId,
      displayName,
      credential,
      endpoint,
      locator,
      /* @conditional-compile-remove(PSTN-calls) */ alternateCallerId,
      /* @conditional-compile-remove(video-background-effects) */ callAdapterOptions
    },
    afterAdapterCreate
  );

  const shouldHideScreenShare = isMobileSession || isIOS();

  const options: CallWithChatCompositeOptions = useMemo(
    () => ({
      callControls: {
        screenShareButton: shouldHideScreenShare ? false : undefined
      }
    }),
    [shouldHideScreenShare]
  );

  // Dispose of the adapter in the window's before unload event.
  // This ensures the service knows the user intentionally left the call if the user
  // closed the browser tab during an active call.
  useEffect(() => {
    const disposeAdapter = (): void => adapter?.dispose();
    window.addEventListener('beforeunload', disposeAdapter);
    return () => window.removeEventListener('beforeunload', disposeAdapter);
  }, [adapter]);

  if (!adapter) {
    return <Spinner label={'Creating adapter'} ariaLive="assertive" labelPosition="top" />;
  }

  let callInvitationUrl: string | undefined = window.location.href;
  // Only show the call invitation url if the call is a group call or Teams call, do not show for Rooms, 1:1 or 1:N calls
  if (!isGroupCallLocator(locator) && !isTeamsMeetingLinkLocator(locator)) {
    callInvitationUrl = undefined;
  }

  return (
    <CallWithChatComposite
      adapter={adapter}
      fluentTheme={currentTheme.theme}
      rtl={currentRtl}
      joinInvitationURL={callInvitationUrl}
      options={options}
      formFactor={isMobileSession ? 'mobile' : 'desktop'}
    />
  );
};

const convertPageStateToString = (state: CallWithChatAdapterState): string => {
  switch (state.page) {
    case 'accessDeniedTeamsMeeting':
      return 'error';
    case 'leftCall':
      return 'end call';
    case 'removedFromCall':
      return 'end call';
    default:
      return `${state.page}`;
  }
};

const isTeamsMeetingLinkLocator = (
  locator: TeamsMeetingLinkLocator | CallAndChatLocator
): locator is TeamsMeetingLinkLocator => {
  return 'meetingLink' in locator;
};

const isGroupCallLocator = (locator: TeamsMeetingLinkLocator | CallAndChatLocator): boolean => {
  return 'callLocator' in locator && 'groupId' in locator.callLocator;
};
