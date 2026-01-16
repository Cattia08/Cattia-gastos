import { format, isToday, isYesterday, isThisWeek, startOfDay } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Get a human-readable label for a date
 * Returns "Hoy", "Ayer", weekday name, or formatted date
 */
export const getDateLabel = (date: Date): string => {
    if (isToday(date)) {
        return "Hoy";
    }
    if (isYesterday(date)) {
        return "Ayer";
    }
    if (isThisWeek(date, { weekStartsOn: 1 })) {
        // Return weekday name for this week (e.g., "Lunes", "Martes")
        return format(date, "EEEE", { locale: es });
    }
    // Return formatted date for older dates
    return format(date, "EEEE d 'de' MMMM", { locale: es });
};

/**
 * Get a short date key for grouping (YYYY-MM-DD)
 */
export const getDateKey = (date: Date): string => {
    return format(startOfDay(date), "yyyy-MM-dd");
};

/**
 * Group transactions by date
 * Returns array of { label, dateKey, transactions[] }
 */
export interface DateGroup<T> {
    label: string;
    dateKey: string;
    date: Date;
    transactions: T[];
    total: number;
}

export const groupTransactionsByDate = <T extends { date: string; amount: number }>(
    transactions: T[]
): DateGroup<T>[] => {
    const groups = new Map<string, DateGroup<T>>();

    // Sort transactions by date descending first
    const sorted = [...transactions].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    for (const transaction of sorted) {
        const date = new Date(transaction.date);
        const dateKey = getDateKey(date);

        if (!groups.has(dateKey)) {
            groups.set(dateKey, {
                label: getDateLabel(date),
                dateKey,
                date: startOfDay(date),
                transactions: [],
                total: 0,
            });
        }

        const group = groups.get(dateKey)!;
        group.transactions.push(transaction);
        group.total += transaction.amount;
    }

    // Convert to array sorted by date descending
    return Array.from(groups.values()).sort(
        (a, b) => b.date.getTime() - a.date.getTime()
    );
};
