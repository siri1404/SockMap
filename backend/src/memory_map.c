/*
 * Memory mapping functionality
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <dirent.h>
#include <sys/types.h>
#include "../include/sockmap.h"

int scan_memory(struct memory_info **memory) {
    DIR *proc_dir = opendir("/proc");
    if (!proc_dir) {
        return -1;
    }

    // First pass: count total memory segments
    int total_count = 0;
    struct dirent *proc_entry;
    while ((proc_entry = readdir(proc_dir)) != NULL) {
        if (proc_entry->d_type != DT_DIR) continue;
        
        pid_t pid = atoi(proc_entry->d_name);
        if (pid <= 0) continue;

        char maps_path[256];
        snprintf(maps_path, sizeof(maps_path), "/proc/%d/maps", pid);
        
        FILE *maps_file = fopen(maps_path, "r");
        if (!maps_file) continue;

        char line[1024];
        while (fgets(line, sizeof(line), maps_file)) {
            total_count++;
        }
        fclose(maps_file);
    }
    closedir(proc_dir);

    if (total_count == 0) {
        *memory = NULL;
        return 0;
    }

    *memory = malloc(total_count * sizeof(struct memory_info));
    if (!*memory) {
        return -1;
    }

    // Second pass: collect memory information
    proc_dir = opendir("/proc");
    if (!proc_dir) {
        free(*memory);
        return -1;
    }

    int index = 0;
    while ((proc_entry = readdir(proc_dir)) != NULL && index < total_count) {
        if (proc_entry->d_type != DT_DIR) continue;
        
        pid_t pid = atoi(proc_entry->d_name);
        if (pid <= 0) continue;

        char maps_path[256];
        snprintf(maps_path, sizeof(maps_path), "/proc/%d/maps", pid);
        
        FILE *maps_file = fopen(maps_path, "r");
        if (!maps_file) continue;

        char line[1024];
        while (fgets(line, sizeof(line), maps_file) && index < total_count) {
            unsigned long start_addr, end_addr;
            char perms[8], pathname[256];
            
            if (sscanf(line, "%lx-%lx %7s %*x %*x:%*x %*d %255s",
                       &start_addr, &end_addr, perms, pathname) >= 3) {
                
                struct memory_info *mem = &(*memory)[index];
                mem->pid = pid;
                
                snprintf(mem->address, sizeof(mem->address), "0x%lx", start_addr);
                mem->size = end_addr - start_addr;
                strncpy(mem->permissions, perms, sizeof(mem->permissions) - 1);
                mem->permissions[sizeof(mem->permissions) - 1] = '\0';
                
                // Determine memory type
                if (strstr(pathname, "[heap]")) {
                    strcpy(mem->type, "heap");
                } else if (strstr(pathname, "[stack]")) {
                    strcpy(mem->type, "stack");
                } else if (strstr(pathname, ".so")) {
                    strcpy(mem->type, "library");
                } else if (pathname[0] == '/') {
                    strcpy(mem->type, "file");
                } else {
                    strcpy(mem->type, "anonymous");
                }
                
                mem->is_shared = (perms[3] == 's');
                
                index++;
            }
        }
        fclose(maps_file);
    }
    closedir(proc_dir);

    return index;
}