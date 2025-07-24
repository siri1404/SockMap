/*
 * Process information gathering
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <dirent.h>
#include <unistd.h>
#include <sys/types.h>
#include "../include/sockmap.h"

int scan_processes(struct process_info **processes) {
    DIR *proc_dir = opendir("/proc");
    if (!proc_dir) {
        return -1;
    }

    // Count processes first
    int count = 0;
    struct dirent *proc_entry;
    while ((proc_entry = readdir(proc_dir)) != NULL) {
        if (proc_entry->d_type == DT_DIR && atoi(proc_entry->d_name) > 0) {
            count++;
        }
    }
    closedir(proc_dir);

    if (count == 0) {
        *processes = NULL;
        return 0;
    }

    *processes = malloc(count * sizeof(struct process_info));
    if (!*processes) {
        return -1;
    }

    // Collect process information
    proc_dir = opendir("/proc");
    if (!proc_dir) {
        free(*processes);
        return -1;
    }

    int index = 0;
    while ((proc_entry = readdir(proc_dir)) != NULL && index < count) {
        if (proc_entry->d_type != DT_DIR) continue;
        
        pid_t pid = atoi(proc_entry->d_name);
        if (pid <= 0) continue;

        struct process_info *proc = &(*processes)[index];
        proc->pid = pid;

        // Get process name
        char *name = get_process_name(pid);
        if (name) {
            strncpy(proc->name, name, sizeof(proc->name) - 1);
            proc->name[sizeof(proc->name) - 1] = '\0';
            free(name);
        } else {
            strcpy(proc->name, "unknown");
        }

        // Count sockets for this process
        proc->socket_count = count_process_sockets(pid);

        // Get memory usage
        proc->memory_usage = get_process_memory_usage(pid);

        // Get CPU usage (simplified)
        proc->cpu_usage = get_process_cpu_usage(pid);

        // Get process status
        get_process_status(pid, proc->status, sizeof(proc->status));

        index++;
    }
    closedir(proc_dir);

    return index;
}

char* get_process_name(pid_t pid) {
    char path[256];
    snprintf(path, sizeof(path), "/proc/%d/comm", pid);
    
    FILE *file = fopen(path, "r");
    if (!file) return NULL;

    char *name = malloc(MAX_PROCESS_NAME);
    if (!name) {
        fclose(file);
        return NULL;
    }

    if (fgets(name, MAX_PROCESS_NAME, file)) {
        // Remove newline
        char *newline = strchr(name, '\n');
        if (newline) *newline = '\0';
    } else {
        strcpy(name, "unknown");
    }

    fclose(file);
    return name;
}

int count_process_sockets(pid_t pid) {
    char fd_path[256];
    snprintf(fd_path, sizeof(fd_path), "/proc/%d/fd", pid);
    
    DIR *fd_dir = opendir(fd_path);
    if (!fd_dir) return 0;

    int socket_count = 0;
    struct dirent *fd_entry;
    while ((fd_entry = readdir(fd_dir)) != NULL) {
        char link_path[512];
        char target[256];
        
        snprintf(link_path, sizeof(link_path), "%s/%s", fd_path, fd_entry->d_name);
        ssize_t len = readlink(link_path, target, sizeof(target) - 1);
        
        if (len > 0) {
            target[len] = '\0';
            if (strncmp(target, "socket:", 7) == 0) {
                socket_count++;
            }
        }
    }
    closedir(fd_dir);

    return socket_count;
}

double get_process_memory_usage(pid_t pid) {
    char path[256];
    snprintf(path, sizeof(path), "/proc/%d/status", pid);
    
    FILE *file = fopen(path, "r");
    if (!file) return 0.0;

    char line[256];
    double memory_kb = 0.0;
    
    while (fgets(line, sizeof(line), file)) {
        if (strncmp(line, "VmRSS:", 6) == 0) {
            sscanf(line, "VmRSS: %lf kB", &memory_kb);
            break;
        }
    }
    fclose(file);

    return memory_kb / 1024.0; // Convert to MB
}

double get_process_cpu_usage(pid_t pid) {
    // Simplified CPU usage calculation
    // In a real implementation, you'd need to calculate this over time
    char path[256];
    snprintf(path, sizeof(path), "/proc/%d/stat", pid);
    
    FILE *file = fopen(path, "r");
    if (!file) return 0.0;

    unsigned long utime, stime;
    if (fscanf(file, "%*d %*s %*c %*d %*d %*d %*d %*d %*u %*u %*u %*u %*u %lu %lu", &utime, &stime) == 2) {
        fclose(file);
        // This is a simplified calculation - real CPU usage requires time sampling
        return ((double)(utime + stime)) / 100.0; // Rough approximation
    }
    
    fclose(file);
    return 0.0;
}

void get_process_status(pid_t pid, char *status, size_t status_len) {
    (void)status_len; // Suppress unused parameter warning
    char path[256];
    snprintf(path, sizeof(path), "/proc/%d/stat", pid);
    
    FILE *file = fopen(path, "r");
    if (!file) {
        strcpy(status, "unknown");
        return;
    }

    char state;
    if (fscanf(file, "%*d %*s %c", &state) == 1) {
        switch (state) {
            case 'R': strcpy(status, "running"); break;
            case 'S': strcpy(status, "sleeping"); break;
            case 'D': strcpy(status, "waiting"); break;
            case 'Z': strcpy(status, "zombie"); break;
            case 'T': strcpy(status, "stopped"); break;
            default: strcpy(status, "unknown"); break;
        }
    } else {
        strcpy(status, "unknown");
    }
    
    fclose(file);
}

int is_socket_hung(struct socket_info *socket) {
    // Simple heuristic: if socket is in CLOSE_WAIT state for too long
    return (strcmp(socket->state, "CLOSE_WAIT") == 0);
}

int detect_memory_leak(struct socket_info *socket) {
    // Simple heuristic: if memory usage is unusually high
    return (socket->memory_usage > 10240); // > 10KB
}

int get_socket_memory_usage(pid_t pid, int socket_fd) {
    (void)socket_fd; // Suppress unused parameter warning
    char path[256];
    snprintf(path, sizeof(path), "/proc/%d/status", pid);
    
    FILE *file = fopen(path, "r");
    if (!file) return 1024; // Default fallback

    char line[256];
    unsigned long socket_mem = 1024; // Base socket overhead
    
    while (fgets(line, sizeof(line), file)) {
        if (strncmp(line, "VmData:", 7) == 0) {
            unsigned long data_kb;
            if (sscanf(line, "VmData: %lu kB", &data_kb) == 1) {
                // Estimate socket memory as a fraction of data segment
                socket_mem = (data_kb * 1024) / 100; // Rough estimate
                break;
            }
        }
    }
    fclose(file);

    return (int)socket_mem;
}

void output_results(struct sockmap_config *cfg, 
                   struct socket_info *sockets, int socket_count,
                   struct memory_info *memory, int memory_count,
                   struct process_info *processes, int process_count) {
    time_t timestamp = time(NULL);
    
    if (cfg->output_format == OUTPUT_JSON) {
        output_json(sockets, socket_count, memory, memory_count, processes, process_count, timestamp);
    } else {
        output_table(sockets, socket_count, memory, memory_count, processes, process_count, timestamp);
    }
}

void output_json(struct socket_info *sockets, int socket_count,
                struct memory_info *memory, int memory_count,
                struct process_info *processes, int process_count,
                time_t timestamp) {
    printf("{\n");
    printf("  \"timestamp\": %ld,\n", timestamp);
    
    // Output sockets
    printf("  \"sockets\": [\n");
    for (int i = 0; i < socket_count; i++) {
        printf("    {\n");
        printf("      \"pid\": %d,\n", sockets[i].pid);
        printf("      \"process_name\": \"%s\",\n", sockets[i].process_name);
        printf("      \"local_address\": \"%s\",\n", sockets[i].local_address);
        printf("      \"remote_address\": \"%s\",\n", sockets[i].remote_address);
        printf("      \"state\": \"%s\",\n", sockets[i].state);
        printf("      \"protocol\": \"%s\",\n", sockets[i].protocol);
        printf("      \"memory_usage\": %lu,\n", sockets[i].memory_usage);
        printf("      \"is_hung\": %s,\n", sockets[i].is_hung ? "true" : "false");
        printf("      \"has_leak\": %s\n", sockets[i].has_leak ? "true" : "false");
        printf("    }%s\n", (i < socket_count - 1) ? "," : "");
    }
    printf("  ],\n");
    
    // Output memory
    printf("  \"memory\": [\n");
    for (int i = 0; i < memory_count; i++) {
        printf("    {\n");
        printf("      \"pid\": %d,\n", memory[i].pid);
        printf("      \"address\": \"%s\",\n", memory[i].address);
        printf("      \"size\": %lu,\n", memory[i].size);
        printf("      \"permissions\": \"%s\",\n", memory[i].permissions);
        printf("      \"type\": \"%s\",\n", memory[i].type);
        printf("      \"is_shared\": %s\n", memory[i].is_shared ? "true" : "false");
        printf("    }%s\n", (i < memory_count - 1) ? "," : "");
    }
    printf("  ],\n");
    
    // Output processes
    printf("  \"processes\": [\n");
    for (int i = 0; i < process_count; i++) {
        printf("    {\n");
        printf("      \"pid\": %d,\n", processes[i].pid);
        printf("      \"name\": \"%s\",\n", processes[i].name);
        printf("      \"socket_count\": %d,\n", processes[i].socket_count);
        printf("      \"memory_usage\": %.2f,\n", processes[i].memory_usage);
        printf("      \"cpu_usage\": %.2f,\n", processes[i].cpu_usage);
        printf("      \"status\": \"%s\"\n", processes[i].status);
        printf("    }%s\n", (i < process_count - 1) ? "," : "");
    }
    printf("  ]\n");
    printf("}\n");
}

void output_table(struct socket_info *sockets, int socket_count,
                 struct memory_info *memory, int memory_count,
                 struct process_info *processes, int process_count,
                 time_t timestamp) {
    (void)memory; // Suppress unused parameter warning
    (void)memory_count; // Suppress unused parameter warning
    printf("=== SockMap Report (Timestamp: %ld) ===\n\n", timestamp);
    
    printf("SOCKETS:\n");
    printf("%-8s %-16s %-20s %-20s %-12s %-8s %-8s %-5s %-5s\n",
           "PID", "Process", "Local", "Remote", "State", "Protocol", "Memory", "Hung", "Leak");
    printf("%-8s %-16s %-20s %-20s %-12s %-8s %-8s %-5s %-5s\n",
           "---", "-------", "-----", "------", "-----", "--------", "------", "----", "----");
    
    for (int i = 0; i < socket_count; i++) {
        printf("%-8d %-16s %-20s %-20s %-12s %-8s %-8lu %-5s %-5s\n",
               sockets[i].pid, sockets[i].process_name,
               sockets[i].local_address, sockets[i].remote_address,
               sockets[i].state, sockets[i].protocol,
               sockets[i].memory_usage,
               sockets[i].is_hung ? "YES" : "NO",
               sockets[i].has_leak ? "YES" : "NO");
    }
    
    printf("\nPROCESSES:\n");
    printf("%-8s %-16s %-8s %-10s %-8s %-10s\n",
           "PID", "Name", "Sockets", "Memory(MB)", "CPU(%)", "Status");
    printf("%-8s %-16s %-8s %-10s %-8s %-10s\n",
           "---", "----", "-------", "---------", "-----", "------");
    
    for (int i = 0; i < process_count; i++) {
        printf("%-8d %-16s %-8d %-10.2f %-8.2f %-10s\n",
               processes[i].pid, processes[i].name,
               processes[i].socket_count, processes[i].memory_usage,
               processes[i].cpu_usage, processes[i].status);
    }
}

void free_socket_info(struct socket_info *sockets, int count) {
    (void)count; // Suppress unused parameter warning
    if (sockets) {
        free(sockets);
    }
}

void free_memory_info(struct memory_info *memory, int count) {
    (void)count; // Suppress unused parameter warning
    if (memory) {
        free(memory);
    }
}

void free_process_info(struct process_info *processes, int count) {
    (void)count; // Suppress unused parameter warning
    if (processes) {
        free(processes);
    }
}