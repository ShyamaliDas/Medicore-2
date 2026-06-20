package service.userservice.userservice.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import service.userservice.userservice.model.PharmacistProfile;
@Repository public interface PharmacistProfileRepository extends JpaRepository<PharmacistProfile, String> {}