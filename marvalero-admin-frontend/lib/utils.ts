import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { StatusType } from "@/app/components/admin/StatusBadge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function mapUserStatus(
  status: 'ACTIVE' | 'DISABLED'
): StatusType {
  console.log("Mapping user status:", status);
  switch (status) {
    case 'ACTIVE':
      return 'active';
    case 'DISABLED':
      return 'disabled';
    default:
      return 'active';
  }
}

// Add a helper function to safely format dates
export const safeFormatDate = (dateString: string | null | undefined, formatString: string): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    return format(date, formatString);
  } catch (error) {
    console.error('Date formatting error:', error, dateString);
    return 'Invalid date';
  }
};

// Or use this more robust version that handles various date formats
export const formatDateSafely = (dateString: any, formatStr: string): string => {
  if (!dateString) return 'N/A';
  
  let date: Date;
  
  // Handle different date formats
  if (typeof dateString === 'string') {
    // Try parsing as ISO string
    date = new Date(dateString);
    
    // If invalid, try parsing as timestamp
    if (isNaN(date.getTime()) && !isNaN(Number(dateString))) {
      date = new Date(Number(dateString));
    }
  } else if (typeof dateString === 'number') {
    date = new Date(dateString);
  } else if (dateString instanceof Date) {
    date = dateString;
  } else {
    return 'Invalid date';
  }
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    console.warn('Invalid date value:', dateString);
    return 'Invalid date';
  }
  
  try {
    return format(date, formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid format';
  }
};

/**
 * Format Stripe timestamps (Unix seconds) to readable date
 * Stripe returns: created: 1769034975 (seconds since Unix epoch)
 */
export const formatStripeDate = (timestamp: number | string | null | undefined, formatStr: string = 'MMM d, yyyy'): string => {
  if (timestamp === null || timestamp === undefined) return 'N/A';
  
  try {
    let date: Date;
    
    if (typeof timestamp === 'number') {
      // Check if it's Unix timestamp in seconds (Stripe format)
      if (timestamp < 10000000000) { // Less than 10 billion = likely seconds
        date = new Date(timestamp * 1000); // Convert seconds to milliseconds
      } else {
        date = new Date(timestamp); // Already in milliseconds
      }
    } else if (typeof timestamp === 'string') {
      // Try to parse as number first
      const num = Number(timestamp);
      if (!isNaN(num)) {
        // It's a numeric string
        if (num < 10000000000) {
          date = new Date(num * 1000); // Convert seconds to milliseconds
        } else {
          date = new Date(num); // Already milliseconds
        }
      } else {
        // Try parsing as ISO string
        date = new Date(timestamp);
      }
    } else {
      return 'Invalid date';
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date value:', timestamp);
      return 'Invalid date';
    }
    
    return format(date, formatStr);
  } catch (error) {
    console.error('Date formatting error:', error, timestamp);
    return 'Error';
  }
};

/**
 * Format date with time for display
 */
export const formatDateTime = (timestamp: number | string | null | undefined): string => {
  return formatStripeDate(timestamp, 'MMM d, yyyy HH:mm');
};

/**
 * Format relative time (e.g., "2 days ago")
 */
import { formatDistanceToNow } from 'date-fns';

export const formatRelativeTime = (timestamp: number | string | null | undefined): string => {
  if (timestamp === null || timestamp === undefined) return 'N/A';
  
  try {
    let date: Date;
    
    if (typeof timestamp === 'number') {
      date = timestamp < 10000000000 
        ? new Date(timestamp * 1000)
        : new Date(timestamp);
    } else if (typeof timestamp === 'string') {
      const num = Number(timestamp);
      if (!isNaN(num)) {
        date = num < 10000000000 
          ? new Date(num * 1000)
          : new Date(num);
      } else {
        date = new Date(timestamp);
      }
    } else {
      return 'N/A';
    }
    
    if (isNaN(date.getTime())) return 'Invalid date';
    
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.error('Relative time formatting error:', error);
    return 'Error';
  }
};

// Helper function to format Stripe amount (cents to dollars)
export const formatStripeAmount = (amount: number, currency: string = "usd") => {
  return `$${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
};





