import type {GetServerSidePropsContext} from 'next'

import {SearchReviewsProvider} from '../../../../providers/SearchReviews'
import {getReviews, getDataBySlug} from '../../../../api'
import withError from '../../../../components/withError'
import {checkSlugToRedirect} from '../../../../utils/checkSlugToRedirect'
import {SomeProfile, ProfileReview} from '../../../../types'
import ReviewsMainPage from '../../../../components/profiles/Reviews/ReviewsContent'

type PageProps = {
    result: SomeProfile
    reviews: ProfileReview[]
    totalReviews: number
    defaultFilters: {
        page: number
        search: string
        sort: string
    }
}

function SpecialistMainPage({result, reviews, totalReviews, defaultFilters}: PageProps) {
    return (
        <SearchReviewsProvider
            reviews={reviews}
            profileId={result.id}
            totalCount={totalReviews}
            defaultFilters={defaultFilters}
        >
            <ReviewsMainPage profile={result}/>
        </SearchReviewsProvider>
    )
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
    try {
        const lang = context.locale as string
        const slug = context.params?.slug as string
        const page = context.params?.page as string

        const {sort = '', search = '', limit = 10} = context.query || {}

        const slugToRedirect = checkSlugToRedirect(slug)

        if (slugToRedirect) {
            return {
                redirect: {
                    destination: `/${lang}/part-of-url/${slugToRedirect}/reviews/${page}`
                }
            }
        }

        const pageQuery = {
            page: Number(page),
            sort,
            search
        }
        const dataResponse = await getDataBySlug({
            lang,
            slug
        })

        if (dataResponse.statusCode || dataResponse.message) {
            return {
                props: {
                    errorCode: dataResponse.statusCode || 500
                },
                notFound: true
            }
        }
        const {result} = dataResponse
        const {reviews = [], totalCount = null} = await getReviews({
            id: result.id,
            lang,
            search: pageQuery.search as string,
            sort: pageQuery.sort as string,
            limit,
            offset: (pageQuery.page - 1) * limit
        })

        if (!reviews.length) {
            return {
                notFound: true
            }
        }

        return {
            props: {
                result,
                slug,
                reviews: Array.isArray(reviews) ? reviews : [],
                totalReviews: totalCount,
                defaultFilters: pageQuery
            }
        }
    } catch (_err) {
        return {
            props: {
                errorCode: 500
            }
        }
    }
}

export default withError<PageProps>(SpecialistMainPage)
