import axios, { AxiosResponse, Method } from "axios";
import { baseApiRequest } from "./util";

import { Entry } from "../common/store/entries/types";
import { DynamicProps } from "../common/store/dynamic-props/types";

import { initialState as dynamicPropsInitialState } from "../common/store/dynamic-props";
import * as hiveApi from "../common/api/hive";

import { cache } from "./cache";
import config from "../config";

export const optimizeEntries = (entries: Entry[]): Entry[] => {
  return entries;
  /* Optimization disabled for now
    return entries.map((x) => {
        return {
            ...x,
            ...{active_votes: []}, // remove active votes
        };
    }); */
};

const makeApiAuth = () => {
  try {
    const auth = Buffer.from(config.privateApiAuth, "base64").toString("utf-8");
    return JSON.parse(auth);
  } catch (e) {
    return null;
  }
};

export const apiRequest = (
  endpoint: string,
  method: Method,
  extraHeaders: any = {},
  payload: any = {}
): Promise<AxiosResponse> | Promise<any> => {
  const apiAuth = makeApiAuth();
  if (!apiAuth) {
    return new Promise((resolve, reject) => {
      console.error("Api auth couldn't be created!");
      reject("Api auth couldn't be created!");
    });
  }

  const url = `${config.privateApiAddr}/${endpoint}`;

  const headers = {
    "Content-Type": "application/json",
    ...makeApiAuth(),
    ...extraHeaders,
  };

  return baseApiRequest(url, method, headers, payload);
};

export const fetchPromotedEntries = async (): Promise<Entry[]> => {
  // fetch list from api
  const list: { author: string; permlink: string; post_data?: Entry }[] = (
    await apiRequest("promoted-posts?limit=200", "GET")
  ).data;

  // random sort & random pick 18 (6*3)
  const promoted = list
    .sort(() => Math.random() - 0.5)
    .filter((x, i) => i < 18);

  return promoted.map((x) => x.post_data).filter((x) => x) as Entry[];
};

export const getPromotedEntries = async (): Promise<Entry[]> => {
  let promoted: Entry[] | undefined = cache.get("promoted-entries");
  if (promoted === undefined) {
    try {
      promoted = await fetchPromotedEntries();
      cache.set("promoted-entries", promoted, 60);
    } catch (e) {
      promoted = [];
    }
  }

  return promoted.sort(() => Math.random() - 0.5);
};

export const getSearchIndexCount = async (): Promise<number> => {
  let indexCount: number | undefined = cache.get("index-count");
  if (indexCount === undefined) {
    try {
      indexCount = (await axios
        .get("https://hivesearcher.com/api/count")
        .then((r) => r.data)) as number;
    } catch (e) {
      indexCount = 0;
    }

    cache.set("index-count", indexCount, 86400);
  }

  return indexCount;
};

export const getDynamicProps = async (): Promise<DynamicProps> => {
  let props: DynamicProps | undefined = cache.get("dynamic-props");
  if (props === undefined) {
    try {
      props = await hiveApi.getDynamicProps();
      cache.set("dynamic-props", props, 120);
    } catch (e) {
      props = { ...dynamicPropsInitialState };
    }
  }

  return props;
};
