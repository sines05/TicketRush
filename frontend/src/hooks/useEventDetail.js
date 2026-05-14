import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import eventService from '../services/eventService.js';
import feedbackService from '../services/feedbackService.js';
import { useAuth } from './useAuth.js';

/**
 * Custom hook to manage event detail logic, including data fetching and feedback submission.
 * 
 * @param {string} slug - The event slug.
 * @param {string} [locationKey] - Optional location key to trigger re-fetch on navigation.
 */
export function useEventDetail(slug, locationKey) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [seatMap, setSeatMap] = useState(null);
  const [error, setError] = useState('');

  const [recommendedEvents, setRecommendedEvents] = useState([]);
  const [recommendedLoading, setRecommendedLoading] = useState(false);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    Promise.allSettled([
      eventService.getEventDetail(slug),
      eventService.getSeatMap(slug)
    ]).then(([eventRes, seatMapRes]) => {
      if (!mounted) return;

      if (eventRes.status === 'fulfilled') {
        const evt = eventRes.value;
        setEvent(evt);
        
        // Fetch recommendations once we have the event ID
        setRecommendedLoading(true);
        eventService.getSimilarEvents(evt.id)
          .then(recs => {
            if (mounted) setRecommendedEvents(recs.filter(r => r.id !== evt.id));
          })
          .catch(() => {
            // Silently fail recommendations
            if (mounted) setRecommendedEvents([]);
          })
          .finally(() => {
            if (mounted) setRecommendedLoading(false);
          });
      } else {
        setError(eventRes.reason?.message || 'Không tải được thông tin sự kiện');
      }

      if (seatMapRes.status === 'fulfilled') {
        setSeatMap(seatMapRes.value);
      }
      
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [slug, locationKey]);

  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['reviews', event?.id],
    queryFn: () => feedbackService.getReviews(event?.id),
    enabled: !!event?.id,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  const reviewMutation = useMutation({
    mutationFn: feedbackService.submitReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', event?.id] });
      setComment('');
      setRating(5);
    }
  });

  const handleReviewSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!user) {
      navigate('/auth/login');
      return;
    }
    reviewMutation.mutate({ event_id: event.id, rating, comment });
  };

  const minPrice = useMemo(() => {
    const prices = seatMap?.zones?.map((z) => z.price).filter(Boolean) ?? [];
    return prices.length ? Math.min(...prices) : null;
  }, [seatMap]);

  return {
    event,
    seatMap,
    reviews,
    loading,
    error,
    minPrice,
    recommendedEvents,
    recommendedLoading,
    reviewMutation,
    reviewsLoading,
    handleReviewSubmit,
    rating,
    setRating,
    comment,
    setComment
  };
}
