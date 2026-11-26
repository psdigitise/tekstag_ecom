import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { fetchReviews } from '../api'

function StarRating({ count = 5 }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="#00B67A">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  )
}

function ReviewCard({ review }) {
  return (
    <div className="bg-white border border-gray-100 rounded-sm p-4 min-w-[260px] flex-1">
      <div className="flex items-center gap-2 mb-2">
        <StarRating count={review.stars} />
      </div>
      <p className="text-[13px] font-bold text-gray-800 mb-1">{review.title}</p>
      <p className="text-[12px] text-gray-500 leading-snug mb-2">{review.body}</p>
      <p className="text-[11px] text-gray-400">
        <strong className="text-gray-600">{review.authorName || review.author}</strong>
        {(review.createdAt || review.timeAgo) && `, ${review.createdAt || review.timeAgo}`}
      </p>
    </div>
  )
}

export default function Reviews() {
  const [offset, setOffset] = useState(0)
  const [reviews, setReviews] = useState([])

  useEffect(() => {
    fetchReviews()
      .then(data => setReviews(Array.isArray(data) ? data : []))
      .catch(console.error)
  }, [])

  // Hidden until there are real reviews in the database.
  if (reviews.length === 0) return null

  // Summary computed from the reviews actually stored (no external rating claims).
  const average = reviews.reduce((sum, r) => sum + (Number(r.stars) || 0), 0) / reviews.length

  return (
    <section className="bg-[#F9F9F9] py-8 border-y border-gray-100">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="relative">
          {/* Prev button */}
          <button
            onClick={() => setOffset(Math.max(0, offset - 1))}
            disabled={offset === 0}
            aria-label="Previous reviews"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} className="text-gray-600" />
          </button>

          <div className="flex gap-3 overflow-hidden">
            {reviews.slice(offset).map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>

          {/* Next button */}
          <button
            onClick={() => setOffset(Math.min(reviews.length - 1, offset + 1))}
            disabled={offset >= reviews.length - 1}
            aria-label="Next reviews"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} className="text-gray-600" />
          </button>
        </div>

        {/* Rating summary from stored reviews */}
        <div className="mt-5 text-center text-[12px] text-gray-500">
          Rated{' '}
          <strong className="text-gray-700">{average.toFixed(1)} / 5</strong> based on{' '}
          {reviews.length} review{reviews.length !== 1 ? 's' : ''}.
        </div>
      </div>
    </section>
  )
}
