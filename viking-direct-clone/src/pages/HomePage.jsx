import WelcomeBanner from '../components/WelcomeBanner'
import TopCategories from '../components/TopCategories'
import PromoCards from '../components/PromoCards'
import HeroProducts from '../components/HeroProducts'
import TrustBar from '../components/TrustBar'
import DealsSection from '../components/DealsSection'
import TopRecommendations from '../components/TopRecommendations'
import TrustBanners from '../components/TrustBanners'
import Reviews from '../components/Reviews'
import VikingOneSection from '../components/VikingOneSection'
import PopularBrands from '../components/PopularBrands'
import ProductGrid from '../components/ProductGrid'
import FreeGiftsBanner from '../components/FreeGiftsBanner'

export default function HomePage() {
  return (
    <>
      <WelcomeBanner />
      <HeroProducts />
      <TopCategories />
      <PromoCards />
      <TrustBar />
      <DealsSection />
      <TopRecommendations />
      <TrustBanners variant="delivery" />
      <Reviews />
      <VikingOneSection />
      <PopularBrands />
      <ProductGrid />
      <TrustBanners variant="service" />
      <FreeGiftsBanner />
    </>
  )
}
