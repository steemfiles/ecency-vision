#include <boost/process.hpp>
#include <iostream>
#include <signal.h>
#include <map>
#include <string>
#include <unistd.h>
using namespace boost::process;
std::map<int, std::string> signal_names;
std::fstream mainserverlog("server.log", std::ofstream::app);
child * cptr = nullptr;
void report_and_continue(int signal) {
    mainserverlog << "[" << getpid() << "] Caught signal " << signal_names[signal] << std::endl << std::flush;
}
void report_and_exit(int signal) {
    mainserverlog << "[" << getpid() << "] Caught signal " << signal_names[signal] << ".  Exiting" << std::endl << std::flush;
    if (cptr) {
        cptr->terminate();
    }
    exit(0);
}
int main()
{
    ipstream pipe_stream;
    std::string line;
    mainserverlog << "[" << getpid() <<  "] Starting Master Server" << std::endl;
    signal_names[SIGABRT] = "SIGABRT";
    signal_names[SIGALRM] = "SIGALRM";
    signal_names[SIGBUS] = "SIGBUS";
    signal_names[SIGCHLD] = "SIGCHLD";
    signal_names[SIGCLD] = "SIGCLD";
    signal_names[SIGCONT] = "SIGCONT";
    //signal_names[SIGEMT] = "SIGEMT";
    signal_names[SIGFPE] = "SIGFPE";
    signal_names[SIGHUP] = "SIGHUP";
    signal_names[SIGILL] = "SIGILL";
    //signal_names[SIGINFO] = "SIGINFO";
    signal_names[SIGINT] = "SIGINT";
    signal_names[SIGIO] = "SIGIO";
    signal_names[SIGIOT] = "SIGIOT";
    signal_names[SIGKILL] = "SIGKILL";
    //signal_names[SIGLOST] = "SIGLOST";
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
    //signal_names[SIGUNUSED] = "SIGUNUSED";
    signal_names[SIGURG] = "SIGURG";
    signal_names[SIGUSR1] = "SIGUSR1";
    signal_names[SIGUSR2] = "SIGUSR2";
    signal_names[SIGVTALRM] = "SIGVTALRM";
    signal_names[SIGXCPU] = "SIGXCPU";
    signal_names[SIGXFSZ] = "SIGXFSZ";
    signal_names[SIGWINCH] = "SIGWINCH";
    signal(SIGALRM, report_and_continue);
    signal(SIGBUS, report_and_continue);
    signal(SIGCLD, report_and_continue);
    signal(SIGCONT, report_and_continue);
    //signal(SIGEMT, report_and_continue);
    signal(SIGFPE, report_and_continue);
    signal(SIGHUP, report_and_continue);
    signal(SIGILL, report_and_continue);
    //signal(SIGINFO, report_and_continue);
    signal(SIGIO, report_and_continue);
    #ifdef SIGLOST
        signal(SIGLOST, report_and_continue);
    #endif
    signal(SIGPIPE, report_and_continue);
    signal(SIGPOLL, report_and_continue);
    signal(SIGPROF, report_and_continue);
    signal(SIGPWR, report_and_continue);
    signal(SIGQUIT, report_and_continue);
    signal(SIGSEGV, report_and_continue);
    signal(SIGSTKFLT, report_and_continue);
    signal(SIGSTOP, report_and_continue);
    signal(SIGTSTP, report_and_continue);
    signal(SIGSYS, report_and_continue);
    signal(SIGTRAP, report_and_continue);
    signal(SIGTTIN, report_and_continue);
    signal(SIGTTOU, report_and_continue);
    signal(SIGURG, report_and_continue);
    signal(SIGUSR1, report_and_continue);
    signal(SIGUSR2, report_and_continue);
    signal(SIGVTALRM, report_and_continue);
    signal(SIGXCPU, report_and_continue);
    signal(SIGXFSZ, report_and_continue);
    signal(SIGWINCH, report_and_continue);
    signal(SIGHUP, SIG_IGN);
    signal(SIGTERM, report_and_exit);
    {
        std::ofstream pidfile("server.pid");
        pidfile << getpid() << std::endl;
        pidfile.close();
    }
    while (true) {
        try {
            std::fstream subserverlog("subserver.log", std::fstream::app);
            child c("node build/server.js", std_out > pipe_stream);
            cptr = &c;
            while (c.running() && pipe_stream && std::getline(pipe_stream, line) && !line.empty())
                subserverlog << "[" << c.id() << "]" << line << std::endl;
            {
                std::ofstream pidfile("subserver.pid");
                pidfile << c.id() << std::endl;
            }
            c.wait();
            mainserverlog << "Process " << c.id() << " exited with status " << c.exit_code() << std::endl;
            sleep(10);
        } catch (const boost::process::process_error& e) {
            mainserverlog << "Process exception" << std::endl;
        }
        cptr = nullptr;
    }
    unlink("server.pid");
    mainserverlog << "[" << getpid() << "] Exiting Master Server: " << std::endl;
}