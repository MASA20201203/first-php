import * as dotenv from 'dotenv';
import Twitter from 'twitter-api-v2';
import Redis from 'ioredis';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(timezone);
dayjs.extend(utc);

const REDIS_LIKED_TWEET_IDS_KEY = 'liked_tweet_ids';

dotenv.config();

interface Tweet {
  id: string;
  url: string;
}

const twitterClient = new Twitter({
  appKey: process.env.TWITTER_API_KEY ?? '',
  appSecret: process.env.TWITTER_API_KEY_SECRET ?? '',
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

async function requestLikedTweets(userId: string): Promise<Tweet[]> {
  const likedTweets = await twitterClient.v2.userLikedTweets(userId);
  console.log(likedTweets.rateLimit);
  // console.log(likedTweets);
  return likedTweets.tweets.map((t) => {
    return {
      id: t.id,
      url: `https://twitter.com/twitter/status/${t.id}`,
    };
  });
}

async function findNewLikedTweets(tweets: Tweet[]): Promise<Tweet[]> {
  const redis = new Redis();
  const likedTweetIds = tweets.map((t) => t.id);

  // is first run?
  const isFirstRun = (await redis.scard(REDIS_LIKED_TWEET_IDS_KEY)) === 0;
  if (isFirstRun) {
    console.log('This is first run.');
    await redis.sadd(REDIS_LIKED_TWEET_IDS_KEY, likedTweetIds);
    return [];
  }

  // find new liked tweets.
  const knownTweetIds = await redis.smembers(REDIS_LIKED_TWEET_IDS_KEY);
  const newLikedTweets = tweets.filter((t) => !knownTweetIds.includes(t.id));
  await redis.sadd(REDIS_LIKED_TWEET_IDS_KEY, likedTweetIds);
  return newLikedTweets;
}

async function tweetLikedTweet(tweet: Tweet): Promise<void> {
  const dateTime = dayjs(Date()).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss');
  const status = `${process.env.TWEET_TEXT}\n検知日時: ${dateTime}\n${tweet.url}`;
  await twitterClient.v1.tweet(status);
  // console.log(status);
}

async function main() {
  const userId = process.env.TARGET_TWITTER_USER_ID ?? '';
  const likedTweets = await requestLikedTweets(userId);
  // console.log(likedTweets);
  const newLikedTweets = await findNewLikedTweets(likedTweets);
  console.log(newLikedTweets);
  for (const tweet of newLikedTweets) {
    await tweetLikedTweet(tweet);
  }
}

main().finally(() => {
  process.exit();
});
