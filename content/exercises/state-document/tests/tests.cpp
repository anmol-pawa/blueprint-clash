#include <string>
#include "bp_test.h"
#include "solution.h"

TEST(Workflow, StartsAsAnEmptyDraft) {
  Document d;
  EXPECT_EQ(d.stateName(), std::string("draft"));
  EXPECT_EQ(d.revision(), 0);
}

TEST(Workflow, DraftsCanBeEditedAndCountRevisions) {
  Document d;
  EXPECT_TRUE(d.edit());
  EXPECT_TRUE(d.edit());
  EXPECT_EQ(d.revision(), 2);
  EXPECT_EQ(d.stateName(), std::string("draft"));
}

TEST(Workflow, SubmitMovesDraftToReview) {
  Document d;
  EXPECT_TRUE(d.submit());
  EXPECT_EQ(d.stateName(), std::string("review"));
}

TEST(Workflow, EditIsRefusedInReview) {
  Document d;
  d.edit();
  d.submit();
  EXPECT_FALSE(d.edit());
  EXPECT_EQ(d.revision(), 1);
  EXPECT_EQ(d.stateName(), std::string("review"));
}

TEST(Workflow, ApproveMovesReviewToPublished) {
  Document d;
  d.submit();
  EXPECT_TRUE(d.approve());
  EXPECT_EQ(d.stateName(), std::string("published"));
}

TEST(Workflow, RejectSendsReviewBackToDraft) {
  Document d;
  d.edit();
  d.submit();
  EXPECT_TRUE(d.reject());
  EXPECT_EQ(d.stateName(), std::string("draft"));
  EXPECT_EQ(d.revision(), 1);  // the work is kept
  EXPECT_TRUE(d.edit());       // and the author can fix it
  EXPECT_EQ(d.revision(), 2);
}

TEST(Workflow, PublishedIsFinal) {
  Document d;
  d.submit();
  d.approve();
  EXPECT_FALSE(d.edit());
  EXPECT_FALSE(d.submit());
  EXPECT_FALSE(d.approve());
  EXPECT_FALSE(d.reject());
  EXPECT_EQ(d.stateName(), std::string("published"));
  EXPECT_EQ(d.revision(), 0);
}

TEST(Workflow, ApproveFromDraftIsRefusedAndChangesNothing) {
  Document d;
  EXPECT_FALSE(d.approve());
  EXPECT_EQ(d.stateName(), std::string("draft"));
  EXPECT_FALSE(d.reject());
  EXPECT_EQ(d.stateName(), std::string("draft"));
}

TEST(Workflow, SubmitTwiceIsRefused) {
  Document d;
  EXPECT_TRUE(d.submit());
  EXPECT_FALSE(d.submit());
  EXPECT_EQ(d.stateName(), std::string("review"));
}

TEST(Workflow, RefusedEditsDoNotChangeTheRevision) {
  Document d;
  d.edit();
  d.submit();
  d.edit();
  d.edit();
  EXPECT_EQ(d.revision(), 1);
}

TEST(Workflow, ARejectedDocumentCanGoAroundAgain) {
  Document d;
  d.submit();
  d.reject();
  d.edit();
  EXPECT_TRUE(d.submit());
  EXPECT_TRUE(d.approve());
  EXPECT_EQ(d.stateName(), std::string("published"));
  EXPECT_EQ(d.revision(), 1);
}
