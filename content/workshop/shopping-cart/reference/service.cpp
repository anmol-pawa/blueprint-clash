#include "shop_impl.h"

std::unique_ptr<cart::Shop> cart::makeShop() { return std::make_unique<ShopImpl>(); }

std::unique_ptr<cart::CouponShop> cart::makeCouponShop() { return std::make_unique<ShopImpl>(); }

std::unique_ptr<cart::StackingShop> cart::makeStackingShop() { return std::make_unique<ShopImpl>(); }
