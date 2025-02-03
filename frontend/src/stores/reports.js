import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import moment from 'moment';

export const useReportsStore = defineStore('reports', () => {
  // State
  const monthlyReport = ref(null);
  const isLoading = ref(false);
  const error = ref(null);

  // Getters
  const totals = computed(() => {
    if (!monthlyReport.value) return null;
    return {
      projected: monthlyReport.value.total_projected,
      exercised: monthlyReport.value.total_exercised,
      pending: monthlyReport.value.total_projected - monthlyReport.value.total_exercised
    };
  });

  // Actions
  async function fetchMonthlyReport(accountId, date) {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await fetch(`/api/reports/monthly/${accountId}?date=${date}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch report');
      }
      monthlyReport.value = await response.json();
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    monthlyReport,
    isLoading,
    error,
    totals,
    fetchMonthlyReport
  };
});