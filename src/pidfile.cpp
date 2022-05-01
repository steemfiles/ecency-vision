#include "pidfile.hpp"
#include <fstream>
#include <unistd.h>

pidfile::pidfile(char const *const p_filename, pid_t const p_id)
    : filename(p_filename) {
  std::ofstream fs(p_filename);
  fs << p_id << std::endl;
  fs.close();
}

pidfile::~pidfile() { unlink(filename); }
