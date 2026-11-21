#include "site_impl.h"

std::unique_ptr<qa::Site> qa::makeSite() { return std::make_unique<SiteImpl>(std::make_unique<PlainPolicy>()); }

std::unique_ptr<qa::CappedSite> qa::makeCappedSite(int dailyCap) {
  if (dailyCap < 1) return nullptr;
  return std::make_unique<SiteImpl>(std::make_unique<DailyCapPolicy>(dailyCap));
}

std::unique_ptr<qa::ModeratedSite> qa::makeModeratedSite(int dailyCap) {
  if (dailyCap < 1) return nullptr;
  return std::make_unique<SiteImpl>(std::make_unique<DailyCapPolicy>(dailyCap));
}
