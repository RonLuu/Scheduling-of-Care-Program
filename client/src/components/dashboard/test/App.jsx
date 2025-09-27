import CareTaskCalendar from "./CareTaskCalendar"

function App() {
    const tasks = [
        {
            _id: "1",
            title: "Doctor Appointment",
            startAt: "2025-09-26T10:00:00",
            endAt: "2025-09-26T11:00:00",
        },
        {
            _id: "2",
            title: "Medication Pickup",
            dueDate: "2025-09-27",
        },
    ]

    return <CareTaskCalendar tasks={tasks} />
}

export default App
