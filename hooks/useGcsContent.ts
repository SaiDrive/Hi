
import { useState, useEffect } from 'react';
import { getContent } from '../services/gcsService';

export const useGcsContent = (gcsUrl: string | undefined, userId: string | null) => {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!gcsUrl || !userId) {
      setContent(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    getContent(gcsUrl, userId)
      .then(data => {
        if (isMounted) {
          setContent(data);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [gcsUrl, userId]);

  return { content, isLoading };
};
