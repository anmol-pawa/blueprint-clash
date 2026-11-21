import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-facade", text: "Exposes the public calls and sequences the collaborators: validate, look things up, check the documented rules in order, then write; no point arithmetic of its own", phase: "base", owners: ["SiteImpl", "QASite", "SiteService", "Site", "ForumImpl", "QuestionSite"] },
  { id: "res-posts", text: "Owns the live questions and answers: ids, kinds, authors, which question an answer belongs to, creation order", phase: "base", owners: ["PostBoard", "PostStore", "PostRepository", "Posts", "PostRegistry", "PostDirectory"] },
  { id: "res-votes", text: "Keeps every vote that currently stands (one per voter per post) and counts a post's score; knows nothing about points", phase: "base", owners: ["VoteBook", "VoteStore", "VoteRegistry", "Votes", "VoteLedger", "VoteRepository"] },
  { id: "res-accept", text: "Remembers which answer, if any, is accepted for each question, so accepting another answer moves it", phase: "base", owners: ["AcceptBook", "AcceptanceBook", "AcceptStore", "Acceptances", "AcceptedAnswers", "AcceptRegistry"] },
  { id: "res-ledger", text: "Derives what each user is currently owed or charged from the facts (votes and acceptances that stand) instead of keeping a running balance", phase: "base", owners: ["Ledger", "ReputationLedger", "EventDeriver", "ReputationCalculator", "ReputationService", "ReputationBook"] },
  { id: "res-listing", text: "Builds a question's answer list in its documented order: accepted first, then score, then age", phase: "base", owners: ["AnswerLister", "AnswerRanker", "AnswerList", "AnswerSorter", "AnswerView", "AnswerQuery"] },
  { id: "res-policy", text: "Decides, as its own Strategy, how reputation events add up (plain sum, daily cap), so a new rule adds a class instead of changing the ledger", phase: "storm1", owners: ["ReputationPolicy", "DailyCapPolicy", "CapPolicy", "ReputationStrategy", "ScoringPolicy", "PointsPolicy"] },
  { id: "res-remover", text: "Removes a post together with everything that hangs on it (votes, acceptance, a question's answers) in one place", phase: "storm2", owners: ["PostRemover", "PostDeleter", "PostEraser", "Retirement", "ContentRemover", "PostRetirer"] },
];
