/**
 Program runs build/server and reruns should it crash unexpectedly.  It will
 close build/server, and close when a SIGTERM is sent to itself.  It is
 unaffected by SIGHUP.
 **/

#include "runforever.hpp"
#include "abstractservice.hpp"
#include "pidfile.hpp"
#include <boost/asio/connect.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <boost/beast/core.hpp>
#include <boost/beast/http.hpp>
#include <boost/beast/http/buffer_body.hpp>
#include <boost/beast/http/parser.hpp>
#include <boost/beast/version.hpp>
#include <boost/process.hpp>
#include <boost/thread.hpp>
#include <cstdlib>
#include <functional>
#include <iostream>
#include <map>
#include <memory>
#include <set>
#include <signal.h>
#include <string>
#include <sys/time.h>
#include <unistd.h>
#include <utility>
#define cerr #error "Use  of cerr out of initial start";//

extern const char *raw_version;
std::string fault;
const std::string primary_search_location = "private-api/build/relayserver.js";
const std::string secondary_search_location = "src/server/relayserver.js";

const char *rfc_2822_format = "%a, %d %b %Y %T %z";
const char *RUNFOREVER_MANAGER_VERSION_STRING = "Runforever Manager/0.0";

namespace beast = boost::beast; // from <boost/beast.hpp>
namespace http = beast::http;   // from <boost/beast/http.hpp>
namespace net = boost::asio;    // from <boost/asio.hpp>
using tcp = net::ip::tcp;       // from <boost/asio/ip/tcp.hpp>
using namespace boost::process;
using namespace std;
std::map<int, std::string> signal_names;
std::set<AbstractService *> &operator<<(std::set<AbstractService *> &s,
                                        const AbstractService *p) {
  s.insert(s.cbegin(), (AbstractService *)p);
  return s;
}
std::fstream mainserverlog("manager.log", std::ofstream::app);
bool all_running = false, keep_looping = true;
char datetime_string[200] = "";
bool verbose_threads = false;
bool verbose = false;

std::string get_version() {
  std::string out(raw_version);
  size_t first_nl = out.find('\n');
  size_t second_nl = out.find('\n', first_nl + 1);
  size_t third_nl = out.find('\n', second_nl + 1);
  if (third_nl == string::npos) {
    return out;
  } else {
    return out.substr(0, third_nl);
  }
}

HTTPValidatedService
    privateAPIService("Private API", "private", "node",
                      "private-api/build/private-api-server.js", "2997",
                      "/notifications/unread"),
    promoterService("Promoter", "promotion", "node",
                    "private-api/build/promoter.js", "2998", "/getPromoted"),
    pageAPIService("Page API", "page", "node", "build/server.js", "3000", "/");

TCPValidatedService searchRelayService("Search", "search", "node",
                                       "private-api/build/relayserver.js",
                                       "2999");

std::ostream &mainserverlogline() {
  int cid;
  mainserverlog << "[" << getpid();
  if (!strcmp(datetime_string, "")) {
    // not set yet?
    time_t t;
    struct tm *tmp;

    (t = time(NULL)) != ((time_t)-1) && (tmp = localtime(&t)) != NULL &&
        (strftime(datetime_string, sizeof(datetime_string), rfc_2822_format,
                  tmp) != 0);
  }
  mainserverlog << "; " << datetime_string;
  return mainserverlog << "] ";
}

/*******************************
 *       Logging               *
 *******************************/

// These are and should only be used in the forward_log thread...
ipstream *page_server_pipe_stream = nullptr,
         *search_server_pipe_stream = nullptr,
         *private_server_pipe_stream = nullptr,
         *promoter_server_pipe_stream = nullptr;
std::ofstream subserverlog, searchserverlog, privatelog, promoterlog;
child *page_server_ptr, *search_server_ptr, *private_server_ptr,
    *promoter_server_ptr;

void forward_log(ipstream &ps, std::ostream &log,
                 const boost::process::child *cptr) {
  time_t t;
  struct tm *tmp;

  std::string line;
  char c;
  while (all_running) {
    boost::this_thread::yield();
    try {
      boost::this_thread::sleep_for(boost::chrono::milliseconds(10));
      if (keep_looping && ps && std::getline(ps, line) && !line.empty()) {
        log << "[" << cptr->id() << "; " << datetime_string << "] " << line
            << std::endl;
      }
    } catch (...) {
    }
  }
}

/*************************************
 *  Signal Handling                  *
 *************************************/

void report_and_continue(int signal) {
  mainserverlogline() << "Caught signal " << signal_names[signal] << "."
                      << std::endl;
}

void set_to_exit(int signal) {
  report_and_continue(signal);
  mainserverlogline() << "Caught signal " << signal_names[signal] << "."
                      << std::endl;
  keep_looping = false;
}

void report_and_set_process_closed(int signal) {
  report_and_continue(signal);
  all_running = false;
}

void init_signal_names() {
  signal_names[SIGBUS] = "SIGBUS";
  signal_names[SIGCHLD] = "SIGCHLD";
  signal_names[SIGCLD] = "SIGCLD";
  signal_names[SIGCONT] = "SIGCONT";
  // signal_names[SIGEMT] = "SIGEMT";
  signal_names[SIGFPE] = "SIGFPE";
  signal_names[SIGHUP] = "SIGHUP";
  signal_names[SIGILL] = "SIGILL";
  // signal_names[SIGINFO] = "SIGINFO";
  signal_names[SIGINT] = "SIGINT";
  signal_names[SIGIO] = "SIGIO";
  signal_names[SIGIOT] = "SIGIOT";
  // signal_names[SIGLOST] = "SIGLOST";
  signal_names[SIGPIPE] = "SIGPIPE";
  signal_names[SIGPOLL] = "SIGPOLL";
  signal_names[SIGPROF] = "SIGPROF";
  signal_names[SIGPWR] = "SIGPWR";
  signal_names[SIGQUIT] = "SIGQUIT";
  signal_names[SIGSEGV] = "SIGSEGV";
  signal_names[SIGSTKFLT] = "SIGSTKFLT";
  signal_names[SIGSTOP] = "SIGSTOP";
  signal_names[SIGTSTP] = "SIGTSTP";
  signal_names[SIGSYS] = "SIGSYS";
  signal_names[SIGTERM] = "SIGTERM";
  signal_names[SIGTRAP] = "SIGTRAP";
  signal_names[SIGTTIN] = "SIGTTIN";
  signal_names[SIGTTOU] = "SIGTTOU";
  // signal_names[SIGUNUSED] = "SIGUNUSED";
  signal_names[SIGURG] = "SIGURG";
  signal_names[SIGUSR1] = "SIGUSR1";
  signal_names[SIGUSR2] = "SIGUSR2";
  signal_names[SIGVTALRM] = "SIGVTALRM";
  signal_names[SIGXCPU] = "SIGXCPU";
  signal_names[SIGXFSZ] = "SIGXFSZ";
  signal_names[SIGWINCH] = "SIGWINCH";

  signal_names[SIGABRT] = "SIGABRT";
  signal_names[SIGALRM] = "SIGALRM";
  signal_names[SIGKILL] = "SIGKILL";
}

const struct sigaction sigLogAction = {report_and_continue, (long int)0,
                                       0xffffffff, SA_RESTART, (long int)0};

const struct sigaction
    sigRestartChildrenAction = {report_and_set_process_closed, 0, 0xffffffff,
                                SA_RESTART | SA_NOCLDSTOP, 0},

    sigExitAllAction = {set_to_exit, 0, 0xffffffff, SA_RESTART, 0};

void set_handlers() {
  // Block certain signals for this process
  struct sigaction old;
  sigaction(SIGBUS, &sigLogAction, &old);
  // blocking these will prevent children from finishing properly.
  // sigaction(SIGCHLD, &sigLogAction, &old);
  // sigaction(SIGCLD, &sigRestartChildrenAction, &old);
  // sigaction(SIGCONT, &sigLogAction, &old);
  // signal_names[SIGEMT
  sigaction(SIGFPE, &sigLogAction, &old);
  sigaction(SIGHUP, &sigLogAction, &old);
  sigaction(SIGILL, &sigLogAction, &old);
  // signal_names[SIGINF
  sigaction(SIGINT, &sigExitAllAction, &old);
  sigaction(SIGIO, &sigLogAction, &old);
  sigaction(SIGIOT, &sigLogAction, &old);
  // signal_names[SIGLOS
  sigaction(SIGPIPE, &sigExitAllAction, &old);
  sigaction(SIGPOLL, &sigLogAction, &old);
  sigaction(SIGPROF, &sigLogAction, &old);
  sigaction(SIGPWR, &sigExitAllAction, &old);
  sigaction(SIGQUIT, &sigExitAllAction, &old);
  sigaction(SIGSEGV, &sigExitAllAction, &old);
  sigaction(SIGSTKFLT, &sigLogAction, &old);
  // sigaction(SIGSTOP, &sigLogAction, &old);
  // sigaction(SIGTSTP, &sigLogAction, &old);
  sigaction(SIGSYS, &sigLogAction, &old);
  sigaction(SIGTERM, &sigLogAction, &old);
  // sigaction(SIGTRAP, &sigLogAction, &old);
  sigaction(SIGTTIN, &sigLogAction, &old);
  sigaction(SIGTTOU, &sigLogAction, &old);
  // signal_names[SIGUNU
  sigaction(SIGURG, &sigLogAction, &old);
  sigaction(SIGUSR1, &sigLogAction, &old);
  sigaction(SIGUSR2, &sigLogAction, &old);

  // irtual alarm clock (4.2BSD)
  // sigaction(SIGVTALRM, &sigLogAction, &old);

  // too much CPU time used.
  sigaction(SIGXCPU, &sigLogAction, &old);

  // the following might be a good place to drop the log files.
  sigaction(SIGXFSZ, &sigLogAction, &old);

  //  Window resize signal
  sigaction(SIGWINCH, &sigLogAction, &old);

  // sigaction(SIGABRT, &sigLogAction, &old);
  // SIGALRM is used by the thread library, best we leave that alone.
  // sigaction(SIGALRM, &sigLogAction, &old);
  sigaction(SIGKILL, &sigLogAction, &old);

  sigaction(SIGBUS, &sigExitAllAction, &old);

  // Happens when you log out after starting:  Trap it.
  sigaction(SIGHUP, &sigLogAction, &old);
  sigaction(SIGINT, &sigExitAllAction, &old);
  sigaction(SIGTERM, &sigExitAllAction, &old);
  // sigaction(SIGABRT, &sigRestartChildrenAction, &old);
}

void keep_time() {
  time_t t;
  struct tm *tmp;
  t = time(NULL);
  // start on the the new second boundary --- just to be exact in time.
  while (t == time(NULL)) {
    boost::this_thread::sleep_for(boost::chrono::milliseconds(1));
  }
  while (keep_looping) {
    // if (verbose_threads)
    //  cerr << "keeping time..." << endl;

    if ((t = time(NULL)) != ((time_t)-1)) {

      (tmp = localtime(&t)) != NULL &&
          (strftime(datetime_string, sizeof(datetime_string), rfc_2822_format,
                    tmp) != 0);

      // resynchronize every 30 minutes
      if (t % 1'800 == 0) {
        // In tests time would drift 0.3 ms/s.
        // So a half hour of waiting a second will only leave us 0.5 s off the
        // correct mark.
        struct timeval tv;
        struct timezone tz;
        gettimeofday(&tv, &tz);
        boost::this_thread::sleep_for(
            boost::chrono::microseconds(1'000'000 - tv.tv_usec));
        continue;
      }
    }
    boost::this_thread::sleep_for(boost::chrono::milliseconds(1000));
  }
}

std::string search_server_location;
std::string search_server_cmd;

AbstractService *services[4] = {&privateAPIService, &searchRelayService,
                                &pageAPIService, &promoterService};

int main(int argc, char **argv) {
#undef cerr
  for (char **argi = argv + 1; argi < argv + argc; ++argi) {
    if (strcmp(*argi, "--verbose-threads") == 0) {
      verbose_threads = true;
    } else if (strcmp(*argi, "--no-verbose-threads") == 0) {
      verbose_threads = false;
    } else if (strcmp(*argi, "--verbose") == 0) {
      verbose = true;
    } else if (strcmp(*argi, "--verbose-threads") == 0) {
      verbose_threads = true;
    } else if (strcmp(*argi, "--version") == 0) {
      cerr << get_version() << endl;
      return 0;
    } else if (strncmp(*argi, "--", 2) == 0) {
      cerr << "Unknown option: \"" << *argi << '\"' << endl;
    } else if (**argi == '-') {
      for (char const *c = &(*argi)[1]; *c; ++c) {
        switch (*c) {
        case 'v':
          verbose = true;
          break;
        case 't':
          verbose_threads = true;
          break;
        default:
          cerr << "Unknown option: \"" << c << '\"' << endl;
          return 0;
        } // switch
      }
    }
  } // for

  bool current_directory_writable = access(".", W_OK) == 0;
  // Check that this program can do everything it needs to do
  {
    bool hung_processes = false;
    bool all_checked_files_exist = true;
    int pid_file_count = 0;
    // Some checks
    vector<pair<pid_t, const char *>> processes;
    for (AbstractService *a_ptr : services) {
      const char *file_name = a_ptr->getPIDFilename().c_str();
      if (access(file_name, F_OK) == 0) {
        ++pid_file_count;
      } else if (!a_ptr->connect()) {
        cerr << "Unable to close server: " << a_ptr->serviceName()
             << ".  Missing PID file." << std::endl;
        keep_looping = false;
        continue;
      }
      ifstream pidf(file_name);
      pid_t pid_number;
      if (pidf.good()) {
        pidf >> pid_number;
        if (pid_number == 0) {
          // cannot read a number from file.
          unlink(file_name);
        } else if (kill(pid_number, 0) == -1 && errno == ESRCH) {
          // process does not exist! Stale PID
          unlink(file_name);
        } else {
          // process is running close it nicely first, then not.
          kill(pid_number, SIGTERM);
          boost::this_thread::sleep_for(boost::chrono::seconds(2));
          kill(pid_number, SIGKILL);
          // connect returns true when it doesn't work
          unlink(file_name);
        }
      }
      if (!a_ptr->connect()) {
        cerr << "Unable to close server: " << a_ptr->serviceName()
             << ".  PID file was out of date or corrupted." << std::endl;
        keep_looping = false;
        continue;
      }
    } // for

    if (!current_directory_writable) {
      std::cerr << "Current directory not writable" << std::endl;
      keep_looping = false;
    }

    if (access("build/server.js", R_OK)) {
      std::cerr << "Cannot find build/server.js to run." << std::endl;
      keep_looping = false;
    }

    if (access((search_server_location = primary_search_location).c_str(),
               R_OK) &&
        access((search_server_location = secondary_search_location).c_str(),
               R_OK) &&
        access((search_server_location = "src/server/relayserver.js").c_str(),
               R_OK)) {
      std::cerr << "Cannot find private-api/build/relayserver.js, "
                << "build/relayserver.js or src/server/relayserver.js to run."
                << std::endl;
      keep_looping = false;
    } else {
      search_server_cmd = "node " + search_server_location;
    }

    if (access("private-api/build/promoter.js", R_OK)) {
      std::cerr << "Cannot find promoter.js to run." << std::endl;
      keep_looping = false;
    }
    char const *t;
    for (auto s : services)
      if (access((t = s->programFile()), R_OK)) {
        std::cerr << "Cannot find " << t << " to run." << std::endl;
        keep_looping = false;
      }
  }

  if (!keep_looping) {
    exit(0);
  }

#if NDEBUG
  // disconnect from the terminal.
  if (fork() != 0) {
    exit(0);
  }

  if (fork() != 0) {
    exit(0);
  }
#endif

  //  Throw error should we try to use stderr now:
  fclose(stderr);

#define cerr #error "Use  of cerr out of initial start";//
  mainserverlogline() << "Starting Manager" << std::endl;

  init_signal_names();
  boost::thread keeping_time(keep_time);
  set_handlers();
  pidfile masterserver("runforever.pid", getpid());

  down << &privateAPIService << &searchRelayService << &pageAPIService
       << &promoterService;

  for (; keep_looping;) {
    for (auto i = down.begin(); i != down.end(); ++i) {
      (*i)->reStart();
    }
    down.clear();

    all_running = true;

    try {
      while (keep_looping && all_running && down.empty()) {
        boost::this_thread::yield();
        boost::this_thread::sleep_for(boost::chrono::seconds(1));
      } // while
    } catch (const boost::process::process_error &e) {
      mainserverlogline() << "Process exception: " << e.what()
                          << ".  Code:" << e.code() << std::endl;

    } catch (boost::wrapexcept<boost::system::system_error> &e) {
      mainserverlogline() << "Exception caught (boost:system::system_error):"
                          << e.what() << std::endl;
    }

    if (down.size()) {
      mainserverlogline() << "The following processes are down:";
      for (const AbstractService *v : down) {
        mainserverlog << v->serviceName() << ", ";
      }
      mainserverlog << ".  Closing....";

      for (AbstractService *v : down) {
        v->close();
        mainserverlog << ".";
      }
      mainserverlog << "done." << endl;
    }

    all_running = false;
  }
  privateAPIService.stop();
  promoterService.stop();
  pageAPIService.stop();
  searchRelayService.stop();
  while (privateAPIService.running() || promoterService.running() ||
         pageAPIService.running() || searchRelayService.running()) {
    boost::this_thread::yield();
    boost::this_thread::sleep_for(boost::chrono::milliseconds(100));
  }
  privateAPIService.close();
  promoterService.close();
  pageAPIService.close();
  searchRelayService.close();
  unlink("manager.pid");
  mainserverlogline() << "Exiting Master Server" << std::endl;
}
