
// Format a timestamp into a human-readable date and time string
export const formatDateTime = (timestamp: number): string => {
    const intDate = parseInt(timestamp.toString(), 10);
    const date: Date = new Date(intDate);
    console.log("Formatting timestamp:", timestamp, "to date:", date);
    return date.toLocaleString();
};