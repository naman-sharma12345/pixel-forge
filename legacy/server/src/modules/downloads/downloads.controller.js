import asyncHandler from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import * as downloadsService from './downloads.service.js';

export const getDownloadLink = asyncHandler(async (req, res) => {
  const result = await downloadsService.getDownloadLink(
    req.user,
    req.params.assetId
  );
  return ok(res, result);
});

export const downloadFile = asyncHandler(async (req, res) => {
  const { filePath, fileName } = await downloadsService.resolveDownloadFile(
    req.params.token
  );
  return res.download(filePath, fileName);
});

export default {
  getDownloadLink,
  downloadFile,
};
