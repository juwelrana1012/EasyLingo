import { ApiRequestLike, ApiResponseLike, handleGrammarCheck } from '../../server/apiHandlers';

export default async function handler(req: ApiRequestLike, res: ApiResponseLike) {
  return handleGrammarCheck(req, res);
}
