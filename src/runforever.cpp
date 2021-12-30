/**
 Program runs build/server and reruns should it crash unexpectedly.  It will
 close build/server, and close when a SIGTERM is sent to itself.  It is
 unaffected by SIGHUP.
 **/

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
#include <signal.h>
#include <string>
#include <sys/time.h>
#include <unistd.h>

extern const char *raw_version;

const char *page_server_cmd = "node build/server.js";
const char *promoter_server_cmd = "node private-api/build/promoter.js";
const char *private_server_cmd = "node private-api/build/private-api-server.js";
const std::string primary_search_location = "private-api/build/relayserver.js";
const std::string secondary_search_location = "src/server/relayserver.js";

const std::string cmds[3] = {page_server_cmd, promoter_server_cmd,
                             primary_search_location};

const char *rfc_2822_format = "%a, %d %b %Y %T %z";
const char *RUNFOREVER_MANAGER_VERSION_STRING = "Runforever Manager/0.0";

namespace beast = boost::beast; // from <boost/beast.hpp>
namespace http = beast::http;   // from <boost/beast/http.hpp>
namespace net = boost::asio;    // from <boost/asio.hpp>
using tcp = net::ip::tcp;       // from <boost/asio/ip/tcp.hpp>
using namespace boost::process;
using namespace std;
std::map<int, std::string> signal_names;
std::fstream mainserverlog("server.log", std::ofstream::app);
child *cptr = nullptr;
bool all_running = false, keep_looping = true;
bool restart_subserver = false;
char datetime_string[200] = "";
bool verbose_threads = false;
bool verbose = false;
char const *fault = nullptr;

// Makes an HTTP connection.  Returns true should it fail.
bool connect_to_http_server(const char *name, const char *port,
                            const char *target) {
  auto const host = "127.0.0.1";
  const int version = 11;
  boost::system::error_code ec;

  // The io_context is required for all I/O
  net::io_context ioc;

  // These objects perform our I/O
  tcp::resolver resolver(ioc);
  beast::tcp_stream stream(ioc);

  if (verbose) {
    cerr << "Preparing to check " << name << " server at port " << port
         << ".\n";
  }

  // Look up the domain name
  auto const results = resolver.resolve(host, port);

  // Make the connection on the IP address we get from a lookup
  stream.connect(results, ec);
  if (ec) {
    if (verbose) {
      cerr << "Unable to connect to " << name << " server at port " << port
           << endl;
    }
    return true;
  } else if (verbose) {
    cerr << "Connected to " << name << " server at port " << port << endl;
  }

  if (ec) {
    if (verbose) {
      cerr << "Error while closing the socket for " << name << " server"
           << endl;
    }
    return true;
  } else
    return false;
}

bool connect_to_private_api_server() {
  return connect_to_http_server("private-api", "2997", "/notifications/unread");
}

// Performs an HTTP GET and prints the response
bool connect_to_search_server() {
  auto const host = "127.0.0.1";
  auto const port = "2999";
  auto const target = "/";
  const int version = 11;
  const char *name = "search";

  if (verbose) {
    cerr << "Preparing to check search server at port " << port << ".\n";
  }

  boost::system::error_code ec;

  // The io_context is required for all I/O
  net::io_context ioc;

  // These objects perform our I/O
  tcp::resolver resolver(ioc);
  beast::tcp_stream stream(ioc);

  // Look up the domain name
  auto const results = resolver.resolve(host, port);

  // Make the connection on the IP address we get from a lookup
  stream.connect(results, ec);
  if (ec) {
    if (verbose) {
      cerr << "Unable to connect to search server at port " << port << endl;
    }
    return true;
  } else if (verbose) {
    cerr << "Connected to search server at port " << port << endl;
  }

  // Gracefully close the socket
  stream.socket().shutdown(tcp::socket::shutdown_both, ec);

  if (ec) {
    if (verbose) {
      cerr << "Error while closing the socket for " << name << " server"
           << endl;
    }
    return true;
  } else
    return false;
}

// Performs an HTTP GET and prints the response
bool connect_to_page_server() {
  auto const host = "127.0.0.1";
  auto const port = "3000";
  auto const target = "/";
  const int version = 11;
  const char *name = "page";

  if (verbose) {
    cerr << "Preparing to check " << name << " server at port " << port
         << ".\n";
  }

  boost::system::error_code ec;

  // The io_context is required for all I/O
  net::io_context ioc;

  // These objects perform our I/O
  tcp::resolver resolver(ioc);
  beast::tcp_stream stream(ioc);

  // Look up the domain name
  auto const results = resolver.resolve(host, port);

  // Make the connection on the IP address we get from a lookup
  stream.connect(results, ec);
  if (ec) {
    if (verbose) {
      cerr << "Unable to connect to " << name << " server at port " << port
           << endl;
    }
    return true;
  }

  // Set up an HTTP GET request message
  http::request<http::string_body> req{http::verb::get, target, version};
  req.set(http::field::host, host);
  req.set(http::field::user_agent, RUNFOREVER_MANAGER_VERSION_STRING);

  // Send the HTTP request to the remote host
  http::write(stream, req, ec);
  if (ec) {
    if (verbose) {
      cerr << "Unable to write header request to " << name << " server at port "
           << port << endl;
    }
    return true;
  }

  // This buffer is used for reading and must be persisted
  beast::flat_buffer buffer;

  // Declare a container to hold the response
  http::response<http::dynamic_body> res;
  boost::beast::http::parser<true, beast::http::buffer_body> bp;

  // Receive the HTTP response
  http::read(stream, buffer, res, ec);
  if (verbose) {
    cerr << "Read from the " << name << " server on port " << port << ": " << ec
         << endl;
  }

  // Gracefully close the socket
  stream.socket().shutdown(tcp::socket::shutdown_both, ec);

  if (ec) {
    if (verbose) {
      cerr << "Error while closing the socket for " << name << " server"
           << endl;
    }
    return true;
  } else
    return false;
}

// Performs an HTTP GET and prints the response
bool connect_to_promoter_server() {
  auto const host = "127.0.0.1";
  auto const port = "2998";
  auto const target = "/getPromoted";
  const int version = 11;
  const char *name = "promotion";
  boost::system::error_code ec;

  // The io_context is required for all I/O
  net::io_context ioc;

  // These objects perform our I/O
  tcp::resolver resolver(ioc);
  beast::tcp_stream stream(ioc);

  if (verbose) {
    cerr << "Preparing to check " << name << " server at port " << port
         << ".\n";
  }

  // Look up the domain name
  auto const results = resolver.resolve(host, port);

  // Make the connection on the IP address we get from a lookup
  stream.connect(results, ec);
  if (ec) {
    if (verbose) {
      cerr << "Unable to connect to " << name << " server at port " << port
           << endl;
    }
    return true;
  }

  // Set up an HTTP GET request message
  http::request<http::string_body> req{http::verb::get, target, version};
  req.set(http::field::host, host);
  req.set(http::field::user_agent, RUNFOREVER_MANAGER_VERSION_STRING);

  // Send the HTTP request to the remote host
  http::write(stream, req, ec);
  if (ec) {
    if (verbose) {
      cerr << "Unable to write header request to " << name << " server at port "
           << port << endl;
    }
    return true;
  } else if (verbose) {
    cerr << "Wrote header and sent request to " << name << " server at port "
         << port << endl;
  }

  // Gracefully close the socket
  stream.socket().shutdown(tcp::socket::shutdown_both, ec);

  if (ec) {
    if (verbose) {
      cerr << "Error while closing the socket for " << name << " server"
           << endl;
    }
    return true;
  } else
    return false;
}

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
    if (verbose_threads)
      cerr << "forwarding log" << endl;

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

void forward_page_log() {
  forward_log(*page_server_pipe_stream, subserverlog, page_server_ptr);
}

void forward_search_log() {
  forward_log(*search_server_pipe_stream, searchserverlog, search_server_ptr);
}

void forward_private_api_log() {
  forward_log(*private_server_pipe_stream, privatelog, private_server_ptr);
}

void forward_promoter_log() {
  forward_log(*promoter_server_pipe_stream, promoterlog, promoter_server_ptr);
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
  if (cptr) {
    kill(cptr->id(), SIGTERM);
  }
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

void keep_time() {
  time_t t;
  struct tm *tmp;
  t = time(NULL);
  // start on the the new second boundary --- just to be exact in time.
  while (t == time(NULL)) {
    boost::this_thread::sleep_for(boost::chrono::milliseconds(1));
  }
  while (keep_looping) {
    if (verbose_threads)
      cerr << "keeping time..." << endl;

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

void check_connectivity() {
  while (keep_looping) {
    if (restart_subserver || connect_to_page_server()) {
      restart_subserver = true;
    }
    boost::this_thread::sleep_for(boost::chrono::seconds(3));
  }
}
std::string search_server_location;
std::string search_server_cmd;

class pidfile {
  char const *filename;

public:
  pidfile(char const *const p_filename, pid_t const p_id)
      : filename(p_filename) {
    std::ofstream fs(p_filename);
    fs << p_id << std::endl;
    fs.close();
  }

  ~pidfile() { unlink(filename); }
};

void mind_server(child *child_ptr, const char *name, bool (*connect)()) {
  while (keep_looping && all_running) {
    if (verbose_threads)
      cerr << "minding " << name << " server" << endl;
    boost::this_thread::sleep_for(boost::chrono::seconds(5));
    if ((*connect)()) {
      mainserverlogline() << "Could not connect to " << name << " subserver"
                          << std::endl;
      fault = name;
      break;
    }

    if (!child_ptr->running()) {
      break;
    }

    boost::this_thread::sleep_for(boost::chrono::seconds(1));
  }

  all_running = false;
}

void mind_promoter_server(child **child_ptr_ptr) {
  while (keep_looping && all_running && child_ptr_ptr != nullptr) {
    if (verbose_threads)
      cerr << "minding promoter server" << endl;
    child &promoter = **child_ptr_ptr;
    if (connect_to_promoter_server()) {
      mainserverlogline() << "Could not connect to promoter server"
                          << std::endl;
    }

    if (!promoter_server_ptr->running()) {
      break;
    }

    boost::this_thread::sleep_for(boost::chrono::seconds(1));
  }

  all_running = false;
}
struct Service {
  std::string service_name;
  std::string interpreter;
  std::string program;
  std::string programLog;
  child **child_ptr_ptr;
};

Service privateAPI = {"Private API", "node",
                      "private-api/build/private-api-server.js", "private.log",
                      nullptr};

Service services[1] = {privateAPI};

int main(int argc, char **argv) {

  for (char **argi = argv + 1; argi < argv + argc; ++argi) {
    if (strcmp(*argi, "--verbose-threads") == 0) {
      verbose_threads = true;
    } else if (strcmp(*argi, "--no-verbose-threads") == 0) {
      verbose_threads = false;
    } else if (strcmp(*argi, "--verbose") == 0) {
      verbose = true;
    } else if (strcmp(*argi, "--version") == 0) {
      cerr << raw_version << endl;
      return 0;
    } else {
      cerr << "Unknown option: \"" << *argi << '\"' << endl;
    }
  }

  bool current_directory_writable = access(".", W_OK) == 0;
  // Check that this program can do everything it needs to do
  {
    bool all_checked_files_exist = true;
    // Some checks
    for (const char *file_name :
         {"server.pid", "subserver.pid", "server.log", "subserver.log",
          privateAPI.programLog.c_str()}) {
      bool file_name_exists = access(file_name, F_OK) == 0;
      all_checked_files_exist = all_checked_files_exist && file_name_exists;
      if (file_name_exists && access(file_name, W_OK)) {
        std::cerr << file_name << " exists but is not writable" << std::endl;
        keep_looping = false;
      }
    } // for

    if (!all_checked_files_exist) {
      if (!current_directory_writable) {
        std::cerr << "Current directory not writable" << std::endl;
        keep_looping = false;
      }
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
    if (access(services[0].program.c_str(), R_OK)) {
      std::cerr << "Cannot find " << services[0].program << " to run."
                << std::endl;
      keep_looping = false;
    }
  }

  if (!keep_looping) {
    exit(0);
  }

  mainserverlogline() << "Starting Manager" << std::endl;

  init_signal_names();
  boost::thread keeping_time(keep_time);

  // Block certain signals for this process
  signal(SIGBUS, set_to_exit);
  signal(SIGHUP, report_and_continue);
  signal(SIGINT, set_to_exit);
  signal(SIGTERM, set_to_exit);
  signal(SIGABRT, report_and_set_process_closed);
  pidfile masterserver("manager.pid", getpid());

  for (; keep_looping;) {

    std::cerr << "Checking for errant servers running.  ";

    if (!(keep_looping = connect_to_search_server())) {
      std::cerr << "Search server already running.  ";
      keep_looping = false;
    }

    if (!(keep_looping &= connect_to_page_server())) {
      std::cerr << "Page server already running.  ";
      keep_looping = false;
    }

    if (!(keep_looping &= connect_to_private_api_server())) {
      std::cerr << "Private API server already running.";
      keep_looping = false;
    }

    if (!(keep_looping &= connect_to_promoter_server())) {
      std::cerr << "Promotion server already running.";
      keep_looping = false;
    }

    if (!keep_looping) {
      std::cerr << std::endl;
      exit(1);
    }

    std::cerr << "Check Succeeded" << std::endl;
    if (promoter_server_pipe_stream) {
      delete promoter_server_pipe_stream;
    }
    promoter_server_pipe_stream = new ipstream();
    promoter_server_ptr =
        new child(promoter_server_cmd, std_out > *promoter_server_pipe_stream);

    if (private_server_pipe_stream) {
      delete private_server_pipe_stream;
    }
    private_server_pipe_stream = new ipstream();
    private_server_ptr =
        new child(private_server_cmd, std_out > *private_server_pipe_stream);

    if (page_server_pipe_stream) {
      delete page_server_pipe_stream;
    }
    page_server_pipe_stream = new ipstream();
    page_server_ptr =
        new child(page_server_cmd, std_out > *page_server_pipe_stream);

    if (search_server_pipe_stream) {
      delete search_server_pipe_stream;
    }
    search_server_pipe_stream = new ipstream();
    search_server_ptr =
        new child(search_server_cmd, std_out > *search_server_pipe_stream);

    pidfile search_pidfile("search.pid", search_server_ptr->id());
    pidfile page_pidfile("page.pid", page_server_ptr->id());
    pidfile promoter_pidfile("promoter.pid", promoter_server_ptr->id());
    pidfile private_pidfile("private.pid", private_server_ptr->id());

    mainserverlogline() << "Running " << page_server_cmd << " ["
                        << page_server_ptr->id() << "]" << std::endl;
    mainserverlogline() << "Running " << search_server_cmd << " ["
                        << search_server_ptr->id() << "]" << std::endl;
    mainserverlogline() << "Running " << private_server_cmd << " ["
                        << private_server_ptr->id() << "]" << std::endl;
    mainserverlogline() << "Running " << promoter_server_cmd << " ["
                        << promoter_server_ptr->id() << "]" << std::endl;

    child &page_server = *page_server_ptr;
    child &search_server = *search_server_ptr;

    all_running = true;

    boost::this_thread::yield();

    subserverlog.open("subserver.log", std::fstream::app);
    searchserverlog.open("search.log", std::fstream::app);
    promoterlog.open("promoter.log", std::fstream::app);
    privatelog.open("private.log", std::fstream::app);

    cptr = &page_server;

    boost::thread log_page_forwarding([&]() {
      forward_log(*page_server_pipe_stream, subserverlog, page_server_ptr);
    });
    boost::thread log_search_forwarding(forward_search_log);
    boost::thread log_promoter_forwarding(forward_promoter_log);
    boost::thread log_private_forwarding([&]() {
      forward_log(*private_server_pipe_stream, privatelog, private_server_ptr);
    });

    mainserverlogline() << "Waiting for servers to start..." << std::flush;
    boost::this_thread::sleep_for(boost::chrono::seconds(10));
    mainserverlog << "done." << std::endl;

    boost::thread minding_search_server([&]() {
      mind_server(search_server_ptr, "search", connect_to_search_server);
    });
    boost::thread minding_page_server([&]() {
      mind_server(page_server_ptr, "page", connect_to_page_server);
    });
    boost::thread minding_private_server([&]() {
      mind_server(private_server_ptr, "private", connect_to_private_api_server);
    });
    boost::thread minding_promoter_server([&]() {
      mind_server(promoter_server_ptr, "promoter", connect_to_promoter_server);
    });
    try {
      while (all_running) {
        boost::this_thread::sleep_for(boost::chrono::seconds(5));
      } // while
    } catch (const boost::process::process_error &e) {
      mainserverlogline() << "Process exception: " << e.what()
                          << ".  Code:" << e.code() << std::endl;

    } catch (boost::wrapexcept<boost::system::system_error> &e) {
      mainserverlogline() << "Exception caught (boost:system::system_error):"
                          << e.what() << std::endl;
    }
    if (fault != nullptr) {
      mainserverlogline()
          << "The " << fault
          << " process died.  Killing other subprocesses and starting again."
          << endl;
    }

    kill(page_server_ptr->id(), SIGKILL);
    page_server_ptr->wait();
    kill(search_server.id(), SIGKILL);
    search_server.wait();
    kill(promoter_server_ptr->id(), SIGKILL);
    promoter_server_ptr->wait();
    kill(private_server_ptr->id(), SIGKILL);
    private_server_ptr->wait();

    log_page_forwarding.join();
    log_search_forwarding.join();
    log_promoter_forwarding.join();
    log_private_forwarding.join();

    mainserverlogline() << "Process Page server  " << page_server_ptr->id()
                        << " exited with status "
                        << page_server_ptr->exit_code() << std::endl;
    mainserverlogline() << "Process Search server " << search_server.id()
                        << " exited with status " << page_server.exit_code()
                        << std::endl;
    mainserverlogline() << "Process Promoter server "
                        << promoter_server_ptr->id() << " exited with status "
                        << promoter_server_ptr->exit_code() << std::endl;
    mainserverlogline() << "Process Private server " << private_server_ptr->id()
                        << " exited with status "
                        << private_server_ptr->exit_code() << std::endl;

    subserverlog.close();
    searchserverlog.close();
    promoterlog.close();
    privatelog.close();

    page_server_pipe_stream->close();
    search_server_pipe_stream->close();
    promoter_server_pipe_stream->close();
    private_server_pipe_stream->close();

    delete search_server_ptr;
    delete page_server_ptr;
    delete promoter_server_ptr;
    delete private_server_ptr;

    private_server_ptr = promoter_server_ptr = search_server_ptr =
        page_server_ptr = nullptr;

    delete page_server_pipe_stream;
    delete search_server_pipe_stream;
    delete promoter_server_pipe_stream;
    delete private_server_pipe_stream;

    page_server_pipe_stream = search_server_pipe_stream =
        promoter_server_pipe_stream = private_server_pipe_stream = nullptr;
  }
  unlink("manager.pid");
  mainserverlogline() << "Exiting Master Server" << std::endl;
}