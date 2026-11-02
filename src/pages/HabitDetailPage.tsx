import { Link, useParams } from 'react-router-dom';
import AppBar from '../components/AppBar';
import { EditIcon } from '../components/icons';
import { useData } from '../data/DataProvider';

// Temporary Stage 5 view: title + Edit button. Full detail screen with charts comes in Stage 6.
export default function HabitDetailPage() {
  const { id } = useParams();
  const habit = useData().habits.find((h) => h.id === id);
  return (
    <>
      <AppBar
        title={habit?.name ?? 'Habit'}
        actions={
          habit && (
            <Link to={`/habit/${habit.id}/edit`} aria-label="Edit habit" className="icon-btn">
              <EditIcon size={22} />
            </Link>
          )
        }
      />
      <p className="py-8 text-center text-neutral-500 dark:text-neutral-400">
        {habit ? 'Stats and charts — coming in Stage 6.' : 'This habit doesn’t exist.'}
      </p>
    </>
  );
}
