#include "fs_impl.h"

std::unique_ptr<fs::FileSystem> fs::makeFileSystem() { return std::make_unique<FileSystemImpl>(); }

std::unique_ptr<fs::SearchableFileSystem> fs::makeSearchableFileSystem() { return std::make_unique<FileSystemImpl>(); }

std::unique_ptr<fs::LinkingFileSystem> fs::makeLinkingFileSystem() { return std::make_unique<FileSystemImpl>(); }
