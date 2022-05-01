#include "abstractservice.hpp"
#include "runforever.hpp"
#include <stdexcept>

std::runtime_error validation_failed("invalid service object");
std::set<AbstractService *> down;
using namespace std;
using namespace std;
void AbstractService::validate() const {
  if (program.c_str() == nullptr)
    throw validation_failed;
}

std::string AbstractService::getPIDFilename() const {
  validate();
  std::string t = base_name + ".pid";
  return t;
}
std::string AbstractService::serviceName() const {
  validate();

  return service_name;
}
void AbstractService::mind_server() {
  validate();
  _stopped = !(mindingFlag = true);
  while (!!mindingFlag) {
    if (verbose_threads)
      cerr << "minding " << service_name << " server " << endl;
    boost::this_thread::sleep_for(boost::chrono::milliseconds(3400));
    if (connect()) {
      mainserverlogline() << "Could not connect to " << service_name
                          << " subserver" << std::endl;
      fault = service_name;
      down << (this);
      break;
    }

    if (!child_ptr->running()) {
      down << (this);
      break;
    }
  }

  _stopped = true;

  validate();
}

void AbstractService::stop() { mindingFlag = false; }

void AbstractService::init() {
  validate();
  std::string cmd = interpreter + " " + program,
              log_filename = base_name + ".log";
  pipe_stream_ptr = new ipstream();
  if (verbose) {
    std::cerr << "executing '" << cmd << '\'' << std::endl;
  }
  child_ptr = new child(cmd.c_str(), std_out > *pipe_stream_ptr);
  pid_ptr = new pidfile(getPIDFilename().c_str(), child_ptr->id());
  mainserverlogline() << "Running " << service_name << " [" << (child_ptr)->id()
                      << "]" << std::endl;
  lout_ptr = new ofstream;
  lout_ptr->open(log_filename, std::fstream::app);

  log_forward_thread_ptr = new boost::thread([&]() {
    try {
      cerr << "Attempting to forward log" << endl;
      forward_log(*pipe_stream_ptr, *lout_ptr, child_ptr);
    } catch (std::exception e) {
      cerr << "Threw an exception " << e.what() << endl;
    }
  });

  mindingFlag = true;
  _stopped = false;
  server_minding_thread_ptr = new boost::thread([&]() { mind_server(); });

  validate();
}
void AbstractService::destroy() {
  validate();
  if (!_stopped)
    return;
  if (pipe_stream_ptr != nullptr) {
    delete log_forward_thread_ptr;
    delete server_minding_thread_ptr;
    delete pipe_stream_ptr;
    delete child_ptr;
    delete lout_ptr;
    delete pid_ptr;
  }
  pipe_stream_ptr = nullptr;
  child_ptr = nullptr;
  pid_ptr = nullptr;
  pipe_stream_ptr = nullptr;
  server_minding_thread_ptr = log_forward_thread_ptr = nullptr;
  validate();
}

bool AbstractService::running() const {
  validate();
  return !_stopped;
}

void AbstractService::onClosed() { validate(); }
void AbstractService::close() {
  validate();
  if (pipe_stream_ptr != nullptr) {
    if (!_stopped)
      mindingFlag = false;
    if (child_ptr->running()) {
      int child_id = child_ptr->id();
      if (kill(child_id, SIGTERM) == 0 || errno != ESRCH) {
        boost::this_thread::sleep_for(boost::chrono::seconds(2));
        kill(child_id, SIGKILL);
      }
      int status;
      boost::this_thread::sleep_for(boost::chrono::milliseconds(10));
      waitpid(child_id, &status, WNOHANG);
    }
    log_forward_thread_ptr->join();
    if (verbose_threads)
      mainserverlogline() << "Process " << service_name << " server  "
                          << child_ptr->id() << " exited with status "
                          << child_ptr->exit_code() << std::endl;
    lout_ptr->close();
    pipe_stream_ptr->close();

    delete server_minding_thread_ptr;
    delete log_forward_thread_ptr;
    server_minding_thread_ptr = log_forward_thread_ptr = nullptr;

    delete child_ptr;
    child_ptr = nullptr;
    delete pipe_stream_ptr;
    pipe_stream_ptr = nullptr;
    delete pid_ptr;
    pid_ptr = nullptr;
    delete lout_ptr;
    lout_ptr = nullptr;
  }
  validate();
}
void AbstractService::reStart() {
  validate();
  if (!running())
    init();
  validate();
}
AbstractService::AbstractService(const char *name, const char *basename_p,
                                 const char *interpreter_p,
                                 const char *program_p)
    : service_name(name), base_name(basename_p), interpreter(interpreter_p),
      program(program_p), child_ptr(nullptr), lout_ptr(nullptr),
      log_forward_thread_ptr(nullptr), server_minding_thread_ptr(nullptr),
      pid_ptr(nullptr), pipe_stream_ptr(nullptr), mindingFlag(false),
      _stopped(true) {
  validate();
}
AbstractService::~AbstractService() {
  validate();
  close();
  validate();
}
const char *AbstractService::port() const {
  validate();
  return "";
}
const char *AbstractService::target() const {
  validate();
  return "";
}

bool AbstractService::connect() const {
  validate();
  char const *const host = "127.0.0.1";
  const int version = 11;
  boost::system::error_code ec;

  // The io_context is required for all I/O
  net::io_context ioc;

  // These objects perform our I/O
  tcp::resolver resolver(ioc);
  beast::tcp_stream stream(ioc);

  // Look up the domain name
  auto const results = resolver.resolve(host, port());

  // Make the connection on the IP address we get from a lookup
  stream.connect(results, ec);
  if (ec) {
    if (verbose_threads) {
      cerr << "Unable to connect to " << service_name << " server at port "
           << port() << endl;
    }
    return true;
  }

  if (ec) {
    if (verbose) {
      cerr << "Error while closing the socket for " << service_name << " server"
           << endl;
    }
    return true;
  } else
    return false;
}

static char pbuf[1024];

const char *AbstractService::programFile() const {
  char const *p = program.c_str();
  if (p == nullptr)
    throw validation_failed;
  strcpy(pbuf, "XXXXXXXXXXX");
  char *q = pbuf;
  while (*q++ = *p++)
    ;
  return pbuf;
}

bool PrivateAPIService::connect() const {
  validate();
  return connect_to_http_server("private-api", "2997", "/notifications/unread");
}
PrivateAPIService::PrivateAPIService()
    : AbstractService("Private API", "private", "node",
                      "private-api/build/private-api-server.js") {
  validate();
}

const char *PrivateAPIService::port() const {
  validate();
  return "2997";
}

const char *PrivateAPIService::target() const {
  validate();
  return "/notifications/unread";
}
