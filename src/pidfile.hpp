#include <cstdlib>
#include <unistd.h>
#if !defined(pidfile)
#define pidfile pidfile
class pidfile {
  char const *filename;

public:
  pidfile(char const *const p_filename, pid_t const p_id);
  ~pidfile();
};
#endif