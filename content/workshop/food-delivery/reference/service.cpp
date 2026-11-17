#include "food_impl.h"

std::unique_ptr<food::Food> food::makeFood() {
  return std::make_unique<FoodImpl>(PromoBook(), KitchenLoad::kUnlimited, std::make_unique<StageFee>());
}

std::unique_ptr<food::PromoFood> food::makePromoFood(const std::vector<food::Promo>& promos) {
  return std::make_unique<FoodImpl>(PromoBook(promos), KitchenLoad::kUnlimited, std::make_unique<StageFee>());
}

std::unique_ptr<food::PromoFood> food::makeBusyKitchens(const std::vector<food::Promo>& promos, int slots) {
  return std::make_unique<FoodImpl>(PromoBook(promos), slots < 1 ? 1 : slots, std::make_unique<StageFee>());
}
