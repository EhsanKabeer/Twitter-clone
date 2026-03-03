"use client";

import { useEffect, useState } from "react";
import { useRecoilState, useSetRecoilState } from "recoil";
import { tweetsState, usersState } from "@/lib/recoil/atoms";
import {
  subscribeToTweets,
  createTweet,
  deleteTweet,
  likeTweet,
  unlikeTweet,
  checkIfLiked,
  getTweet,
  getUser,
} from "@/lib/firebase/firestore";
import { orderBy, limit } from "firebase/firestore";
import { Tweet } from "@/types";
import toast from "react-hot-toast";

export function useTweets() {
  const [tweets, setTweets] = useRecoilState(tweetsState);
  const setUsers = useSetRecoilState(usersState);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToTweets(
      [orderBy("createdAt", "desc"), limit(50)],
      async (fetchedTweets) => {
        // Fetch user data for each tweet
        const userIds = new Set(fetchedTweets.map((tweet) => tweet.userId));
        const userPromises = Array.from(userIds).map((userId) => getUser(userId));
        const users = await Promise.all(userPromises);

        const userMap: Record<string, any> = {};
        users.forEach((user) => {
          if (user) {
            userMap[user.id] = user;
            setUsers((prev) => ({ ...prev, [user.id]: user }));
          }
        });

        const tweetsWithUsers = fetchedTweets.map((tweet) => ({
          ...tweet,
          user: userMap[tweet.userId],
        }));

        setTweets(tweetsWithUsers);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [setTweets, setUsers]);

  return { tweets, isLoading };
}

export function useCreateTweet() {
  const [isLoading, setIsLoading] = useState(false);

  const create = async (content: string, imageUrl?: string, userId: string) => {
    if (!content.trim()) {
      toast.error("Tweet cannot be empty");
      return;
    }

    setIsLoading(true);
    try {
      await createTweet({
        userId,
        content: content.trim(),
        imageUrl,
        likesCount: 0,
        retweetsCount: 0,
        commentsCount: 0,
        isRetweet: false,
      });
      toast.success("Tweet posted!");
    } catch (error) {
      toast.error("Failed to post tweet");
    } finally {
      setIsLoading(false);
    }
  };

  return { create, isLoading };
}

export function useDeleteTweet() {
  const [isLoading, setIsLoading] = useState(false);

  const deleteTweetAction = async (tweetId: string) => {
    setIsLoading(true);
    try {
      await deleteTweet(tweetId);
      toast.success("Tweet deleted");
    } catch (error) {
      toast.error("Failed to delete tweet");
    } finally {
      setIsLoading(false);
    }
  };

  return { deleteTweet: deleteTweetAction, isLoading };
}

export function useLikeTweet() {
  const [likedTweets, setLikedTweets] = useState<Set<string>>(new Set());

  const like = async (tweetId: string, userId: string) => {
    try {
      const isLiked = await checkIfLiked(userId, tweetId);
      if (isLiked) {
        await unlikeTweet(userId, tweetId);
        setLikedTweets((prev) => {
          const next = new Set(prev);
          next.delete(tweetId);
          return next;
        });
      } else {
        await likeTweet(userId, tweetId);
        setLikedTweets((prev) => new Set(prev).add(tweetId));
      }
    } catch (error) {
      toast.error("Failed to like tweet");
    }
  };

  const checkLiked = async (tweetId: string, userId: string) => {
    try {
      const isLiked = await checkIfLiked(userId, tweetId);
      setLikedTweets((prev) => {
        const next = new Set(prev);
        if (isLiked) {
          next.add(tweetId);
        } else {
          next.delete(tweetId);
        }
        return next;
      });
      return isLiked;
    } catch (error) {
      return false;
    }
  };

  return { like, likedTweets, checkLiked };
}

