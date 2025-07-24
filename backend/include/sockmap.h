/*
 * SockMap - Linux Socket and Memory Monitoring Tool
 * Header file with data structures and function declarations
 */

#ifndef SOCKMAP_H
#define SOCKMAP_H

#include <sys/types.h>
#include <time.h>

/* Maximum string lengths */
#define MAX_PROCESS_NAME 256
#define MAX_ADDRESS_LEN 64
#define MAX_STATE_LEN 32
#define MAX_PROTOCOL_LEN 8
#define MAX_PERMISSIONS_LEN 8
#define MAX_TYPE_LEN 16
#define MAX_STATUS_LEN 16

/* Output formats */
typedef enum {
    OUTPUT_JSON,
    OUTPUT_TABLE
} output_format_t;

/* Configuration structure */
struct sockmap_config {
    output_format_t output_format;
    int scan_interval;
    int verbose;
};

/* Socket information structure */
struct socket_info {
    pid_t pid;
    char process_name[MAX_PROCESS_NAME];
    char local_address[MAX_ADDRESS_LEN];
    char remote_address[MAX_ADDRESS_LEN];
    char state[MAX_STATE_LEN];
    char protocol[MAX_PROTOCOL_LEN];
    unsigned long memory_usage;
    int is_hung;
    int has_leak;
};

/* Memory segment information structure */
struct memory_info {
    pid_t pid;
    char address[MAX_ADDRESS_LEN];
    unsigned long size;
    char permissions[MAX_PERMISSIONS_LEN];
    char type[MAX_TYPE_LEN];
    int is_shared;
};

/* Process information structure */
struct process_info {
    pid_t pid;
    char name[MAX_PROCESS_NAME];
    int socket_count;
    double memory_usage;  /* in MB */
    double cpu_usage;     /* percentage */
    char status[MAX_STATUS_LEN];
};

/* Function declarations */

/* Main functions */
int sockmap_init(void);
void sockmap_cleanup(void);
int run_monitoring_loop(struct sockmap_config *cfg);
void print_usage(const char *program_name);

/* Scanning functions */
int scan_sockets(struct socket_info **sockets);
int scan_memory(struct memory_info **memory);
int scan_processes(struct process_info **processes);

/* Output functions */
void output_results(struct sockmap_config *cfg, 
                   struct socket_info *sockets, int socket_count,
                   struct memory_info *memory, int memory_count,
                   struct process_info *processes, int process_count);

void output_json(struct socket_info *sockets, int socket_count,
                struct memory_info *memory, int memory_count,
                struct process_info *processes, int process_count,
                time_t timestamp);

void output_table(struct socket_info *sockets, int socket_count,
                 struct memory_info *memory, int memory_count,
                 struct process_info *processes, int process_count,
                 time_t timestamp);

/* Memory management functions */
void free_socket_info(struct socket_info *sockets, int count);
void free_memory_info(struct memory_info *memory, int count);
void free_process_info(struct process_info *processes, int count);

/* Utility functions */
int is_socket_hung(struct socket_info *socket);
int detect_memory_leak(struct socket_info *socket);
char* get_process_name(pid_t pid);
char* get_process_name_by_inode(unsigned long inode);
int count_process_sockets(pid_t pid);
double get_process_memory_usage(pid_t pid);
double get_process_cpu_usage(pid_t pid);
void get_process_status(pid_t pid, char *status, size_t status_len);
int get_socket_memory_usage(pid_t pid, int socket_fd);

#endif /* SOCKMAP_H */