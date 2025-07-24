/*
 * Socket scanning functionality
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <dirent.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <limits.h>
#include "../include/sockmap.h"

int scan_sockets(struct socket_info **sockets) {
    FILE *tcp_file = fopen("/proc/net/tcp", "r");
    if (!tcp_file) {
        return -1;
    }

    // Count lines first to allocate memory
    int count = 0;
    char line[1024];
    if (!fgets(line, sizeof(line), tcp_file)) {
        fclose(tcp_file);
        return -1;
    }
    while (fgets(line, sizeof(line), tcp_file)) {
        count++;
    }
    rewind(tcp_file);
    if (!fgets(line, sizeof(line), tcp_file)) {
        fclose(tcp_file);
        return -1;
    }

    *sockets = malloc(count * sizeof(struct socket_info));
    if (!*sockets) {
        fclose(tcp_file);
        return -1;
    }

    int index = 0;
    while (fgets(line, sizeof(line), tcp_file) && index < count) {
        unsigned int local_addr, local_port, remote_addr, remote_port;
        int state;
        unsigned long inode;
        
        if (sscanf(line, "%*d: %x:%x %x:%x %x %*s %*s %*s %*s %*s %lu",
                   &local_addr, &local_port, &remote_addr, &remote_port, &state, &inode) == 6) {
            
            struct socket_info *socket = &(*sockets)[index];
            
            // Convert addresses to readable format
            snprintf(socket->local_address, sizeof(socket->local_address),
                     "%d.%d.%d.%d:%d",
                     local_addr & 0xFF, (local_addr >> 8) & 0xFF,
                     (local_addr >> 16) & 0xFF, (local_addr >> 24) & 0xFF,
                     local_port);
            
            snprintf(socket->remote_address, sizeof(socket->remote_address),
                     "%d.%d.%d.%d:%d",
                     remote_addr & 0xFF, (remote_addr >> 8) & 0xFF,
                     (remote_addr >> 16) & 0xFF, (remote_addr >> 24) & 0xFF,
                     remote_port);

            // Map state to string
            switch (state) {
                case 1: strcpy(socket->state, "ESTABLISHED"); break;
                case 2: strcpy(socket->state, "SYN_SENT"); break;
                case 3: strcpy(socket->state, "SYN_RECV"); break;
                case 8: strcpy(socket->state, "CLOSE_WAIT"); break;
                case 10: strcpy(socket->state, "LISTENING"); break;
                case 6: strcpy(socket->state, "TIME_WAIT"); break;
                default: strcpy(socket->state, "UNKNOWN"); break;
            }

            strcpy(socket->protocol, "TCP");
            
            // Try to find process info for this inode
            socket->pid = 0;
            strcpy(socket->process_name, "unknown");
            char *proc_name = get_process_name_by_inode(inode);
            if (proc_name) {
                strncpy(socket->process_name, proc_name, sizeof(socket->process_name) - 1);
                free(proc_name);
            }

            socket->memory_usage = get_socket_memory_usage(socket->pid, 0);
            socket->is_hung = is_socket_hung(socket);
            socket->has_leak = detect_memory_leak(socket);

            index++;
        }
    }

    fclose(tcp_file);
    return index;
}

char* get_process_name_by_inode(unsigned long inode) {
    DIR *proc_dir = opendir("/proc");
    if (!proc_dir) return NULL;

    struct dirent *proc_entry;
    while ((proc_entry = readdir(proc_dir)) != NULL) {
        if (proc_entry->d_type != DT_DIR) continue;
        
        pid_t pid = atoi(proc_entry->d_name);
        if (pid <= 0) continue;

        char fd_path[PATH_MAX];
        snprintf(fd_path, sizeof(fd_path), "/proc/%d/fd", pid);
        
        DIR *fd_dir = opendir(fd_path);
        if (!fd_dir) continue;

        struct dirent *fd_entry;
        while ((fd_entry = readdir(fd_dir)) != NULL) {
            char link_path[PATH_MAX];
            char target[PATH_MAX];
            
            snprintf(link_path, sizeof(link_path), "%s/%s", fd_path, fd_entry->d_name);
            ssize_t len = readlink(link_path, target, sizeof(target) - 1);
            
            if (len > 0) {
                target[len] = '\0';
                char expected[64];
                snprintf(expected, sizeof(expected), "socket:[%lu]", inode);
                
                if (strcmp(target, expected) == 0) {
                    char *proc_name = get_process_name(pid);
                    closedir(fd_dir);
                    closedir(proc_dir);
                    return proc_name;
                }
            }
        }
        closedir(fd_dir);
    }
    
    closedir(proc_dir);
    return NULL;
}