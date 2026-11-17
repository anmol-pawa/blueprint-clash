#pragma once
// Change Storm 2 adds symbolic links. Everything from api.h and api_storm1.h still holds.
#include "api_storm1.h"

namespace fs {

constexpr int kMaxLinkHops = 8;  // most links one path lookup may follow

// A symbolic link is an entry (Kind::Link) that holds an absolute path, its target, and stands in for it.
// The target may not exist (a "dangling" link).
class LinkingFileSystem : public SearchableFileSystem {
 public:
  // Creates a link at `linkPath` to `target`. Both are parsed first (InvalidPath); the target is stored normalised.
  // Then like mkdir: the parent of `linkPath` must exist; a taken name, even one that is itself a link, is AlreadyExists.
  virtual Status symlink(const std::string& target, const std::string& linkPath) = 0;

  // Copies the stored (normalised) target of the link at `path` into `target`. Not a link: NotALink.
  virtual Status readLink(const std::string& path, std::string& target) const = 0;
};

// FOLLOWING. A path is first normalised as in api.h (so ".." is applied to the text, before any link is looked at).
// While looking an entry up:
//  - a link met in the MIDDLE of the path (not its last part) is always followed: its target replaces the parts so
//    far, the remaining parts are appended, and the walk continues from the root;
//  - a link that is the LAST part is followed by read, write, list, size and find (the directory to search), and is
//    NOT followed by kind, readLink, remove, move (either path), mkdir and symlink: these act on the link itself.
//  - write() through a link whose target does not exist creates a file there, if the target's parent directory exists.
//    read(), list(), size() and find() through a dangling link are NotFound.
// Every link followed during one lookup counts as a hop; the (kMaxLinkHops + 1)th is LinkLoop. A chain of exactly
// kMaxLinkHops links still resolves.
// size() of a directory does not follow links inside it (a link counts as 0 bytes); find() reports links by name but
// never descends through them. move() refuses (InvalidPath) a destination that lies inside the moved directory even
// when it gets there through a link.
std::unique_ptr<LinkingFileSystem> makeLinkingFileSystem();

}  // namespace fs
