import { ref } from 'vue'
import { toast } from '@/composables/useToast'
import { toggleInList } from '../utils/artists'

// Keeps the list of favourite artist ids and saves it in the browser,
// so the favourites are still there next time.
export function useFavouriteArtists() {
  const favourites = ref(JSON.parse(localStorage.getItem('favouriteArtists')) || [])

  function toggleFavourite(artist) {
    // check if it is a favourite BEFORE we change the list
    const wasFavourite = favourites.value.includes(artist.id)

    toggleInList(favourites.value, artist.id)
    localStorage.setItem('favouriteArtists', JSON.stringify(favourites.value))

    // show the pop up at the bottom
    if (wasFavourite) {
      toast('Artist removed from favourites')
    } else {
      toast('Artist added to favourites')
    }
  }

  return { favourites, toggleFavourite }
}