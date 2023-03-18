"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const twitter_api_v2_1 = __importDefault(require("twitter-api-v2"));
const ioredis_1 = __importDefault(require("ioredis"));
const dayjs_1 = __importDefault(require("dayjs"));
const timezone_1 = __importDefault(require("dayjs/plugin/timezone"));
const utc_1 = __importDefault(require("dayjs/plugin/utc"));
dayjs_1.default.extend(timezone_1.default);
dayjs_1.default.extend(utc_1.default);
const REDIS_LIKED_TWEET_IDS_KEY = 'liked_tweet_ids';
dotenv.config();
const twitterClient = new twitter_api_v2_1.default({
    appKey: (_a = process.env.TWITTER_API_KEY) !== null && _a !== void 0 ? _a : '',
    appSecret: (_b = process.env.TWITTER_API_KEY_SECRET) !== null && _b !== void 0 ? _b : '',
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});
function requestLikedTweets(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const likedTweets = yield twitterClient.v2.userLikedTweets(userId);
        console.log(likedTweets.rateLimit);
        // console.log(likedTweets);
        return likedTweets.tweets.map((t) => {
            return {
                id: t.id,
                url: `https://twitter.com/twitter/status/${t.id}`,
            };
        });
    });
}
function findNewLikedTweets(tweets) {
    return __awaiter(this, void 0, void 0, function* () {
        const redis = new ioredis_1.default();
        const likedTweetIds = tweets.map((t) => t.id);
        // is first run?
        const isFirstRun = (yield redis.scard(REDIS_LIKED_TWEET_IDS_KEY)) === 0;
        if (isFirstRun) {
            console.log('This is first run.');
            yield redis.sadd(REDIS_LIKED_TWEET_IDS_KEY, likedTweetIds);
            return [];
        }
        // find new liked tweets.
        const knownTweetIds = yield redis.smembers(REDIS_LIKED_TWEET_IDS_KEY);
        const newLikedTweets = tweets.filter((t) => !knownTweetIds.includes(t.id));
        yield redis.sadd(REDIS_LIKED_TWEET_IDS_KEY, likedTweetIds);
        return newLikedTweets;
    });
}
function tweetLikedTweet(tweet) {
    return __awaiter(this, void 0, void 0, function* () {
        const dateTime = (0, dayjs_1.default)(Date()).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss');
        const status = `${process.env.TWEET_TEXT}\n検知日時: ${dateTime}\n${tweet.url}`;
        yield twitterClient.v1.tweet(status);
        // console.log(status);
    });
}
function main() {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const userId = (_a = process.env.TARGET_TWITTER_USER_ID) !== null && _a !== void 0 ? _a : '';
        const likedTweets = yield requestLikedTweets(userId);
        // console.log(likedTweets);
        const newLikedTweets = yield findNewLikedTweets(likedTweets);
        console.log(newLikedTweets);
        for (const tweet of newLikedTweets) {
            yield tweetLikedTweet(tweet);
        }
    });
}
main().finally(() => {
    process.exit();
});
