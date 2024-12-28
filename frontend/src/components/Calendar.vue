<template>
  <div class="calendar">
    <FullCalendar :options="calendarOptions" />
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';

export default defineComponent({
  name: 'CalendarComponent',
  components: {
    FullCalendar,
  },
  data() {
    return {
      calendarOptions: {
        plugins: [dayGridPlugin],
        initialView: 'dayGridMonth',
        events: [
        { title: 'event 1', date: '2024-12-01' },
        { title: 'event 2', date: '2024-12-02' },
        ],
        headerToolbar: {
          left: 'prev,next',
          center: 'title',
          right: 'dayGridWeek,dayGridMonth' // user can switch between the two
        }
      },
    };
  },
});
</script>

<style scoped>
.calendar {
  height: 100vh;
  width: 100%
}
</style>