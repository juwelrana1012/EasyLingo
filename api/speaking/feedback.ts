import { ApiRequestLike, ApiResponseLike, handleSpeakingFeedback } from '../../server/apiHandlers';

export default async function handler(req: ApiRequestLike, res: ApiResponseLike) {
  return handleSpeakingFeedback(req, res);
}
