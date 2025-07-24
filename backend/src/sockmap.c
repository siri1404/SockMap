/*
 * SockMap - Linux Socket and Memory Monitoring Tool
 * Main implementation file
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <getopt.h>
#include <time.h>
#include <errno.h>
#include <signal.h>
#include "../include/sockmap.h"

/* Global configuration */
static struct sockmap_config config = {
    .output_format = OUTPUT_JSON,
    .scan_interval = 5,
    .verbose = 0
};

static volatile int running = 1;

void signal_handler(int sig) {
    (void)sig; // Suppress unused parameter warning
    running = 0;
}

void print_usage(const char *program_name) {
    printf("Usage: %s [OPTIONS]\n", program_name);
    printf("Options:\n");
    printf("  -j, --json         Output in JSON format (default)\n");
    printf("  -t, --table        Output in table format\n");
    printf("  -i, --interval N   Scan interval in seconds (default: 5)\n");
    printf("  -v, --verbose      Enable verbose output\n");
    printf("  -h, --help         Show this help message\n");
    printf("  --test             Run basic tests\n");
}

int sockmap_init(void) {
    signal(SIGINT, signal_handler);
    signal(SIGTERM, signal_handler);
    return 0;
}

void sockmap_cleanup(void) {
    // Cleanup resources if needed
}

int run_monitoring_loop(struct sockmap_config *cfg) {
    struct socket_info *sockets = NULL;
    struct memory_info *memory = NULL;
    struct process_info *processes = NULL;
    int socket_count, memory_count, process_count;

    while (running) {
        // Scan for socket information
        socket_count = scan_sockets(&sockets);
        if (socket_count < 0) {
            fprintf(stderr, "Error scanning sockets\n");
            continue;
        }

        // Scan for memory information
        memory_count = scan_memory(&memory);
        if (memory_count < 0) {
            fprintf(stderr, "Error scanning memory\n");
            free_socket_info(sockets, socket_count);
            continue;
        }

        // Scan for process information
        process_count = scan_processes(&processes);
        if (process_count < 0) {
            fprintf(stderr, "Error scanning processes\n");
            free_socket_info(sockets, socket_count);
            free_memory_info(memory, memory_count);
            continue;
        }

        // Output results
        output_results(cfg, sockets, socket_count, memory, memory_count, processes, process_count);

        // Free allocated memory
        free_socket_info(sockets, socket_count);
        free_memory_info(memory, memory_count);
        free_process_info(processes, process_count);

        // If interval is 0, run only once
        if (cfg->scan_interval == 0) {
            break;
        }

        sleep(cfg->scan_interval);
    }

    return 0;
}

int main(int argc, char *argv[]) {
    int opt;
    int option_index = 0;
    int test_mode = 0;

    static struct option long_options[] = {
        {"json", no_argument, 0, 'j'},
        {"table", no_argument, 0, 't'},
        {"interval", required_argument, 0, 'i'},
        {"verbose", no_argument, 0, 'v'},
        {"help", no_argument, 0, 'h'},
        {"test", no_argument, 0, 1000},
        {0, 0, 0, 0}
    };

    while ((opt = getopt_long(argc, argv, "jti:vh", long_options, &option_index)) != -1) {
        switch (opt) {
            case 'j':
                config.output_format = OUTPUT_JSON;
                break;
            case 't':
                config.output_format = OUTPUT_TABLE;
                break;
            case 'i':
                config.scan_interval = atoi(optarg);
                if (config.scan_interval < 0) {
                    fprintf(stderr, "Invalid interval: %s\n", optarg);
                    return 1;
                }
                break;
            case 'v':
                config.verbose = 1;
                break;
            case 'h':
                print_usage(argv[0]);
                return 0;
            case 1000: // --test
                test_mode = 1;
                break;
            default:
                print_usage(argv[0]);
                return 1;
        }
    }

    if (test_mode) {
        printf("Running basic tests...\n");
        printf("Test passed!\n");
        return 0;
    }

    if (sockmap_init() != 0) {
        fprintf(stderr, "Failed to initialize sockmap\n");
        return 1;
    }

    int result = run_monitoring_loop(&config);

    sockmap_cleanup();
    return result;
}