import { Request, Response } from "express";

import { raw_version } from "../../common/constants/gitversion";

export default async (req: Request, res: Response) => {
  res.write(raw_version);
  res.end();
};
