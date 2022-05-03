#ifndef AbstractService_h
#define AbstractService_h AbstractService_h
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

namespace beast = boost::beast; // from <boost/beast.hpp>
namespace http = beast::http;   // from <boost/beast/http.hpp>
namespace net = boost::asio;    // from <boost/asio.hpp>
using tcp = net::ip::tcp;       // from <boost/asio/ip/tcp.hpp>
using namespace boost::process;
using namespace std;

class AbstractService {
  std::string base_name;
  std::string interpreter;
  std::string program;
  std::string programLog;
  child *child_ptr;
  ofstream *lout_ptr;
  boost::thread *log_forward_thread_ptr;
  boost::thread *server_minding_thread_ptr;
  pidfile *pid_ptr;
  ipstream *pipe_stream_ptr;
  bool mindingFlag;
  bool _stopped;
  // initialize the object and start minding the process it spawns.
  void init();

  // mind the child server process.  This should be run in another thread and
  // is. Inherited classes simply have to make this check that the child server
  // process is running and that connections to it is possible.
  virtual void mind_server();

protected:
  std::string service_name;
  // returns the port number as a string
  virtual const char *port() const;
  // returns the HTTP target as a string (in the base class "")
  virtual const char *target() const;

public:
  // ensure data is consistent in the object,
  // if it isn't, a std::runtime_error exception is thrown.
  void validate() const;
  // connect to the child server process.  Return true if connection fails.
  virtual bool connect() const = 0;
  // return the PID filename as a std::string.
  std::string getPIDFilename() const;
  // return the human readable service name
  std::string serviceName() const;

public:
  // is the child running?
  bool running() const;
  // close the child server process, if running and set a flag so the
  // mind_server method will terminate
  void close();
  // set a flag so the mind_server method will terminate.
  void stop();
  // return the programFile as a string.  The caller should not free the string.
  virtual const char *programFile() const;
  // start for the first time or start again the child server process.
  void reStart();
  AbstractService(const char *name, const char *basename_p,
                  const char *interpreter_p, const char *program_p);
  virtual ~AbstractService();
};
set<AbstractService *> &operator<<(set<AbstractService *> &s,
                                   const AbstractService *p);
extern set<AbstractService *> down;
extern bool all_running, keep_looping;
extern std::string fault;

class TCPValidatedService : public AbstractService {
  char const *_port;

protected:
  const char *port() const override;

public:
  TCPValidatedService(const char *name_p, const char *basename_p,
                      const char *interpreter_p, const char *program_p,
                      const char *port_p);
  virtual bool connect() const override;
};

class HTTPValidatedService : public TCPValidatedService {
  char const *_target;

protected:
  const char *target() const override;

public:
  HTTPValidatedService(const char *name_p, const char *basename_p,
                       const char *interpreter_p, const char *program_p,
                       const char *port_p, const char *target_p);
  virtual bool connect() const override;
};

#endif