import React, { useEffect, useState } from "react";

import { ActiveUser } from "../common/store/active-user/types";
import { Chat, DirectContactsType } from "../common/store/chat/types";
import {
  DirectMessage,
  Profile,
  Keys,
  DirectContact,
  Channel,
  PublicMessage,
  ChannelUpdate
} from "./message-provider-types";

import { initMessageService, MessageEvents } from "../common/helper/message-service";
import { getProfileMetaData, NostrKeys } from "../common/helper/chat-utils";

import { useMappedStore } from "../common/store/use-mapped-store";

export const setNostrkeys = (keys: NostrKeys) => {
  const detail: NostrKeys = {
    pub: keys.pub,
    priv: keys.priv
  };
  const ev = new CustomEvent("createMSInstance", { detail });
  window.dispatchEvent(ev);
};

interface Props {
  addDirectContacts: (data?: DirectContactsType[]) => void;
  addDirectMessages: (peer: string, data?: DirectMessage[]) => void;
  addPublicMessage: (channelId: string, data?: PublicMessage[]) => void;
  addChannels: (data: Channel[]) => void;
  addProfile: (data: Profile[]) => void;
  addleftChannels: (data: string[]) => void;
}

const MessageProvider = (props: Props) => {
  const { activeUser, chat } = useMappedStore();
  const [messageServiceReady, setMessageServiceReady] = useState(false);
  const [since, setSince] = useState<number>(0);
  const [keys, setKeys] = useState<Keys>();
  const [messageService, setMessageService] = useState<any>();
  const [directMessageBuffer, setDirectMessageBuffer] = useState<DirectMessage[]>([]);
  const [publicMessageBuffer, setPublicMessageBuffer] = useState<PublicMessage[]>([]);

  useEffect(() => {
    window.addEventListener("createMSInstance", createMSInstance);

    return () => {
      window.removeEventListener("createMSInstance", createMSInstance);
    };
  }, []);

  useEffect(() => {
    if (!window.messageService && keys) {
      const messageServiceInstance = initMessageService(keys);
      setMessageService(messageServiceInstance);
    }
  }, [keys]);

  useEffect(() => {
    if (activeUser) {
      getNostrKeys(activeUser);
    }
  }, [activeUser]);

  const createMSInstance = (e: Event) => {
    const detail = (e as CustomEvent).detail as NostrKeys;
    const messageServiceInstance = initMessageService(detail);
    setMessageService(messageServiceInstance);
  };

  const getNostrKeys = async (activeUser: ActiveUser) => {
    const profile = await getProfileMetaData(activeUser.username);
    setKeys(profile.noStrKey);
  };

  //Listen for events in an interval.
  useEffect(() => {
    if (!messageServiceReady) return;

    const timer = setTimeout(
      () => {
        messageService?.listen(
          chat.channels.map((x) => x.id),
          Math.floor((since || Date.now()) / 1000)
        );
        setSince(Date.now());
      },
      since === 0 ? 500 : 10000
    );

    return () => {
      clearTimeout(timer);
    };
  }, [since, messageServiceReady, messageService, chat.channels]);

  // // Ready state handler
  const handleReadyState = () => {
    setMessageServiceReady(true);
  };

  useEffect(() => {
    messageService?.removeListener(MessageEvents.Ready, handleReadyState);
    messageService?.addListener(MessageEvents.Ready, handleReadyState);

    return () => {
      messageService?.removeListener(MessageEvents.Ready, handleReadyState);
    };
  }, [messageServiceReady, messageService]);

  // Profile update handler
  const handleProfileUpdate = (data: Profile[]) => {
    // console.log("handleProfileUpdate", data);
    props.addProfile(data);
  };

  useEffect(() => {
    messageService?.removeListener(MessageEvents.ProfileUpdate, handleProfileUpdate);
    messageService?.addListener(MessageEvents.ProfileUpdate, handleProfileUpdate);
    return () => {
      messageService?.removeListener(MessageEvents.ProfileUpdate, handleProfileUpdate);
    };
  }, [messageService, chat.profiles]);

  //Direct contact handler
  const handleDirectContact = (data: DirectContact[]) => {
    const result = [...chat.directContacts];
    data.forEach(({ name, pubkey }) => {
      const isPresent = chat.directContacts.some(
        (obj) => obj.name === name && obj.pubkey === pubkey
      );
      if (!isPresent) {
        result.push({ name, pubkey });
      }
    });
    if (result.length !== 0) {
      props.addDirectContacts(result);
    }
  };

  useEffect(() => {
    messageService?.removeListener(MessageEvents.DirectContact, handleDirectContact);
    messageService?.addListener(MessageEvents.DirectContact, handleDirectContact);
    return () => {
      messageService?.removeListener(MessageEvents.DirectContact, handleDirectContact);
    };
  }, [messageService]);

  // // Direct message handler
  const handleDirectMessage = (data: DirectMessage[]) => {
    setDirectMessageBuffer((directMessageBuffer) => [...directMessageBuffer!, ...data]);
    // console.log("HandleDirectMessage", data);
    messageService?.checkProfiles(data.map((x) => x.peer));
  };

  const setDirectMessages = () => {
    directMessageBuffer.forEach((obj) => {
      const { peer } = obj;
      const matchingStateItem = chat.directMessages.find((stateItem) => stateItem.peer === peer);
      if (matchingStateItem) {
        if (matchingStateItem.chat.length === 0) {
          props.addDirectMessages(peer, [obj]);
          setDirectMessageBuffer((prevMessageBuffer) =>
            prevMessageBuffer.filter((message) => message.id !== obj.id)
          );
        } else {
          let itemExists = false;
          matchingStateItem.chat.forEach((item) => {
            if (item.id === obj.id) {
              itemExists = true;
            }
          });
          if (!itemExists) {
            props.addDirectMessages(peer, [obj]);
            setDirectMessageBuffer((prevMessageBuffer) =>
              prevMessageBuffer.filter((message) => message.id !== obj.id)
            );
          }
        }
      }
    });
  };

  useEffect(() => {
    if (chat.directContacts.length !== 0) {
      setDirectMessages();
    }
  }, [chat.directContacts, directMessageBuffer]);

  useEffect(() => {
    messageService?.removeListener(MessageEvents.DirectMessage, handleDirectMessage);
    messageService?.addListener(MessageEvents.DirectMessage, handleDirectMessage);
    return () => {
      messageService?.removeListener(MessageEvents.DirectMessage, handleDirectMessage);
    };
  }, [messageService]);

  // Channel creation handler
  const handleChannelCreation = (data: Channel[]) => {
    console.log("handleChannelCreation", data);

    const append = data.filter((x) => chat.channels.find((y) => y.id === x.id) === undefined);
    props.addChannels(append);
  };

  useEffect(() => {
    messageService?.removeListener(MessageEvents.ChannelCreation, handleChannelCreation);
    messageService?.addListener(MessageEvents.ChannelCreation, handleChannelCreation);

    return () => {
      messageService?.removeListener(MessageEvents.ChannelCreation, handleChannelCreation);
    };
  }, [messageService]);

  // Channel update handler
  const handleChannelUpdate = (data: ChannelUpdate[]) => {
    console.log("handleChannelUpdate", data);
    // const append = data.filter(x => channelUpdates.find(y => y.id === x.id) === undefined);
    // setChannelUpdates([...channelUpdates, ...append]);
  };

  useEffect(() => {
    messageService?.removeListener(MessageEvents.ChannelUpdate, handleChannelUpdate);
    messageService?.addListener(MessageEvents.ChannelUpdate, handleChannelUpdate);

    return () => {
      messageService?.removeListener(MessageEvents.ChannelUpdate, handleChannelUpdate);
    };
  }, [messageService]);

  //Public Message handler
  const handlePublicMessage = (data: PublicMessage[]) => {
    console.log("handlePublicMessage", data);
    setPublicMessageBuffer((publicMessageBuffer) => [...publicMessageBuffer!, ...data]);

    for (const item of data) {
      const isCreatorMatch = chat.profiles.some((firstItem) => firstItem.creator === item.creator);

      if (!isCreatorMatch) {
        let uniqueUsers: string[] = [];
        for (const item of data) {
          if (!uniqueUsers.includes(item.creator)) {
            uniqueUsers.push(item.creator);
          }
        }
        messageService?.loadProfiles(uniqueUsers);
      }
    }
  };

  useEffect(() => {
    messageService?.removeListener(MessageEvents.PublicMessage, handlePublicMessage);
    messageService?.addListener(MessageEvents.PublicMessage, handlePublicMessage);

    return () => {
      messageService?.removeListener(MessageEvents.PublicMessage, handlePublicMessage);
    };
  }, [messageService, chat.profiles, chat.publicMessages]);

  useEffect(() => {
    if (chat.channels.length !== 0) {
      setPublicMessages();
    }
  }, [chat.publicMessages, publicMessageBuffer]);

  const setPublicMessages = () => {
    publicMessageBuffer.forEach((obj) => {
      const { root } = obj;
      const matchingStateItem = chat.publicMessages.find(
        (stateItem) => stateItem.channelId === root
      );
      if (matchingStateItem) {
        if (matchingStateItem.PublicMessage.length === 0) {
          props.addPublicMessage(root, [obj]);
          setPublicMessageBuffer((prevMessageBuffer) =>
            prevMessageBuffer.filter((message) => message.id !== obj.id)
          );
        } else {
          let itemExists = false;
          matchingStateItem.PublicMessage.forEach((item) => {
            if (item.id === obj.id) {
              itemExists = true;
            }
          });
          if (!itemExists) {
            props.addPublicMessage(root, [obj]);
            setPublicMessageBuffer((prevMessageBuffer) =>
              prevMessageBuffer.filter((message) => message.id !== obj.id)
            );
          }
        }
      }
    });
  };

  // Left channel handler
  const handleLeftChannelList = (data: string[]) => {
    // console.log("handleLeftChannelList", data);
    // setLeftChannelList(data);
    props.addleftChannels(data);
  };

  useEffect(() => {
    messageService?.removeListener(MessageEvents.LeftChannelList, handleLeftChannelList);
    messageService?.addListener(MessageEvents.LeftChannelList, handleLeftChannelList);

    return () => {
      messageService?.removeListener(MessageEvents.LeftChannelList, handleLeftChannelList);
    };
  }, [messageService, chat.leftChannelsList]);

  useEffect(() => {
    return () => {
      messageService?.removeListener(MessageEvents.Ready, handleReadyState);
      messageService?.removeListener(MessageEvents.ProfileUpdate, handleProfileUpdate);
      messageService?.removeListener(MessageEvents.ChannelCreation, handleChannelCreation);
      messageService?.removeListener(MessageEvents.DirectContact, handleDirectContact);
      messageService?.removeListener(MessageEvents.LeftChannelList, handleLeftChannelList);
      messageService?.removeListener(MessageEvents.ChannelUpdate, handleChannelUpdate);
      messageService?.removeListener(MessageEvents.PublicMessage, handlePublicMessage);
      messageService?.removeListener(MessageEvents.DirectMessage, handleDirectMessage);
    };
  }, [messageService]);

  return <>{}</>;
};

export default MessageProvider;
