import { getAccountFull } from "../../../api/hive";

export const getUserChatPublicKey = async (username: string) => {
  const response = await getAccountFull(username);
  if (response && response.posting_json_metadata) {
    const { posting_json_metadata } = response;
    const profile = JSON.parse(posting_json_metadata).profile;
    if (profile) {
      const { nsKey } = profile || {};
      return nsKey;
    }
  }
  return null;
};
