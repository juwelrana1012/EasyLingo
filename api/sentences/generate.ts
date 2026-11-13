import { ApiRequestLike, ApiResponseLike, handleSentencesGenerate } from '../../server/apiHandlers';

export default async function handler(req: ApiRequestLike, res: ApiResponseLike) {
  return handleSentencesGenerate(req, res);
}
