import { useQuery } from '@tanstack/react-query';

import { getActiveProgram } from '@/lib/db/programs';

export function useActiveProgram() {
  return useQuery({
    queryKey: ['activeProgram'],
    queryFn: () => getActiveProgram(),
  });
}
